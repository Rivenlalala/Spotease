"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { toast } from "react-hot-toast";
import { Search, Loader2, Music, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Track } from "@/types/track";

type SearchPlatform = "SPOTIFY" | "NETEASE";

interface TrackSearchModalProps {
  onSelect: (track: Track) => void;
  onClose: () => void;
  userId: string;
  platform: SearchPlatform;
  sourceTrack?: Track;
  playlistId: string;
}

export default function TrackSearchModal({
  onSelect,
  onClose,
  userId,
  platform,
  sourceTrack,
  playlistId,
}: TrackSearchModalProps): ReactNode {
  const initialQuery = sourceTrack ? `${sourceTrack.name} ${sourceTrack.artist}` : "";
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [hasAutoSearched, setHasAutoSearched] = useState(false);
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const url = new URL("/api/tracks/search", window.location.origin);
      url.searchParams.set("platform", platform);
      url.searchParams.set("query", query);
      url.searchParams.set("userId", userId);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to search tracks");
      }
      const data = await response.json();
      setSearchResults(data.tracks);
    } catch (error) {
      console.error("Failed to search tracks:", error);
      toast.error("Failed to search tracks");
    } finally {
      setIsSearching(false);
    }
  }, [query, platform, userId]);

  useEffect(() => {
    if (sourceTrack && !hasAutoSearched) {
      setHasAutoSearched(true);
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTrack, hasAutoSearched]);

  async function handleTrackSelect(track: Track) {
    setIsAdding(true);
    setAddingTrackId(track.id);
    try {
      const response = await fetch(`/api/playlists/${platform.toLowerCase()}/${playlistId}/tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackIds: [track.id],
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add track to playlist");
      }

      onSelect(track);
      onClose();
      toast.success("Track added to playlist");
    } catch (error) {
      console.error("Failed to add track:", error);
      toast.error("Failed to add track to playlist");
    } finally {
      setIsAdding(false);
      setAddingTrackId(null);
    }
  }

  const platformConfig = {
    SPOTIFY: {
      name: "Spotify",
      color: "bg-green-500",
      textColor: "text-green-600",
    },
    NETEASE: {
      name: "Netease",
      color: "bg-red-500",
      textColor: "text-red-600",
    },
  };

  const config = platformConfig[platform];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${config.color}`} />
            Search {config.name} Tracks
          </DialogTitle>
          <DialogDescription>
            {sourceTrack
              ? `Find "${sourceTrack.name}" by ${sourceTrack.artist} on ${config.name}`
              : `Search for tracks on ${config.name} to add to your playlist`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by song name or artist..."
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()} className="gap-2">
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>

        <ScrollArea className="flex-1 max-h-[400px]">
          {isSearching ? (
            <div className="space-y-3 py-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-9 w-9 rounded" />
                </div>
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">
                {query.trim() ? "No results found" : "Search for a track to get started"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Try different keywords or check the spelling
              </p>
            </div>
          ) : (
            <div className="space-y-1 py-2">
              {searchResults.map((track) => {
                const isAddingThis = addingTrackId === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => handleTrackSelect(track)}
                    disabled={isAdding}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="min-w-0 flex-1 text-left">
                      <p className="font-medium truncate">{track.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {track.artist} &bull; {track.album}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {isAddingThis ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <div className="h-9 w-9 rounded-md border bg-background flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                          <Plus className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
