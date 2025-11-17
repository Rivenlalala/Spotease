"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { ChevronRight, RefreshCw, Check, Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { type Playlist } from "@/types/playlist";

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
}

interface PlaylistItemProps {
  playlist: Playlist;
  onSelect?: Dispatch<SetStateAction<Playlist | null>>;
  isSelected?: boolean;
}

export default function PlaylistItem({ playlist, onSelect, isSelected }: PlaylistItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [isRefreshingTracks, setIsRefreshingTracks] = useState(false);

  const handleToggleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isExpanded && tracks.length === 0) {
      await loadTracks();
    }
    setIsExpanded(!isExpanded);
  };

  const handleRefreshTracks = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await loadTracks(true);
  };

  const handleClick = () => {
    onSelect?.(isSelected ? null : playlist);
  };

  const loadTracks = async (refresh = false) => {
    try {
      setIsLoadingTracks(true);
      if (refresh) {
        setIsRefreshingTracks(true);
      }

      const response = await fetch(
        `/api/playlists/${playlist.platform.toLowerCase()}/${playlist.id}/tracks${refresh ? "?refresh=true" : ""}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load tracks");
      }

      const data = await response.json();
      setTracks(data.tracks);
    } catch (error) {
      console.error("Error loading tracks:", error);
    } finally {
      setIsLoadingTracks(false);
      setIsRefreshingTracks(false);
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary shadow-md",
      )}
    >
      <CardContent className="p-0">
        <div
          className={cn(
            "flex items-center gap-4 p-4 cursor-pointer transition-colors",
            isSelected ? "bg-primary/5" : "hover:bg-muted/50",
          )}
          onClick={handleClick}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleToggleExpand}
            aria-label={isExpanded ? "Collapse playlist" : "Expand playlist"}
          >
            <ChevronRight
              className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-90")}
            />
          </Button>

          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
            {playlist.cover ? (
              <img
                src={playlist.cover}
                alt={playlist.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Music className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{playlist.name}</p>
            <p className="text-sm text-muted-foreground">
              {playlist.trackCount} {playlist.trackCount === 1 ? "track" : "tracks"}
            </p>
          </div>

          {isExpanded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleRefreshTracks}
              disabled={isRefreshingTracks}
              aria-label="Refresh tracks"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshingTracks && "animate-spin")} />
            </Button>
          )}

          {isSelected && (
            <Badge variant="default" className="shrink-0">
              <Check className="mr-1 h-3 w-3" />
              Selected
            </Badge>
          )}
        </div>

        {isExpanded && (
          <div className="border-t">
            {isLoadingTracks ? (
              <div className="space-y-3 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-8" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : tracks.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No tracks found</div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="divide-y">
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="w-8 text-right text-sm text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{track.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {track.artist} &bull; {track.album}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
