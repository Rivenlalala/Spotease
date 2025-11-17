"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { ArrowRight, RefreshCw, Link2Off, AlertCircle, Loader2 } from "lucide-react";
import SyncPlaylistsModal from "./SyncPlaylistsModal";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Track } from "@/types/track";
import { PlaylistPair } from "@/types/playlist";

interface PlaylistWithTracks {
  id: string;
  name: string;
  tracks: Track[];
}

interface LinkedPlaylistsProps {
  userId: string;
}

export interface LinkedPlaylistsRef {
  loadLinkedPlaylists: () => Promise<void>;
  updatePairedTracks: (spotifyTrack: Track | null, neteaseTrack: Track | null) => void;
}

const LinkedPlaylists = forwardRef<LinkedPlaylistsRef, LinkedPlaylistsProps>(({ userId }, ref) => {
  const [linkedPlaylists, setLinkedPlaylists] = useState<PlaylistPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncSpotifyPlaylist, setSyncSpotifyPlaylist] = useState<PlaylistWithTracks | null>(null);
  const [syncNeteasePlaylist, setSyncNeteasePlaylist] = useState<PlaylistWithTracks | null>(null);
  const [loadingPairId, setLoadingPairId] = useState<string | null>(null);

  const loadLinkedPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/playlists/linked?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to load linked playlists");
      }
      const { linkedPlaylists } = await response.json();
      setLinkedPlaylists(linkedPlaylists);
    } catch (error) {
      console.error("Failed to load linked playlists:", error);
      setError("Failed to load linked playlists");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadLinkedPlaylists();
  }, [loadLinkedPlaylists]);

  useImperativeHandle(ref, () => ({
    loadLinkedPlaylists,
    updatePairedTracks: (spotifyTrack: Track | null, neteaseTrack: Track | null) => {
      if (!spotifyTrack && !neteaseTrack) return;

      setLinkedPlaylists((playlists) =>
        playlists.map((pair) => {
          const updated = { ...pair };

          if (spotifyTrack && syncSpotifyPlaylist && pair.spotify.id === syncSpotifyPlaylist.id) {
            updated.spotify = {
              ...updated.spotify,
              trackCount: updated.spotify.trackCount + 1,
            };
          }
          if (neteaseTrack && syncNeteasePlaylist && pair.netease.id === syncNeteasePlaylist.id) {
            updated.netease = {
              ...updated.netease,
              trackCount: updated.netease.trackCount + 1,
            };
          }

          return updated;
        }),
      );
    },
  }));

  const handleStartSync = async (spotifyId: string, neteaseId: string) => {
    const pairId = `${spotifyId}-${neteaseId}`;
    setLoadingPairId(pairId);
    try {
      const [spotifyResponse, neteaseResponse] = await Promise.all([
        fetch(`/api/playlists/spotify/${spotifyId}/tracks`),
        fetch(`/api/playlists/netease/${neteaseId}/tracks`),
      ]);

      if (!spotifyResponse.ok || !neteaseResponse.ok) {
        throw new Error("Failed to fetch tracks");
      }

      const [spotifyData, neteaseData] = await Promise.all([
        spotifyResponse.json(),
        neteaseResponse.json(),
      ]);

      const spotifyPlaylist = linkedPlaylists.find((p) => p.spotify.id === spotifyId);
      const neteasePlaylist = linkedPlaylists.find((p) => p.netease.id === neteaseId);

      setSyncSpotifyPlaylist({
        id: spotifyId,
        name: spotifyPlaylist?.spotify.name || "",
        tracks: spotifyData.tracks,
      });
      setSyncNeteasePlaylist({
        id: neteaseId,
        name: neteasePlaylist?.netease.name || "",
        tracks: neteaseData.tracks,
      });
      setShowSyncModal(true);
    } catch (error) {
      console.error("Error loading tracks:", error);
      alert("Failed to load tracks");
    } finally {
      setLoadingPairId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" size="sm" onClick={loadLinkedPlaylists} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (linkedPlaylists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Link2Off className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No linked playlists</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Select playlists from both Spotify and Netease below to link them together for syncing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <CardTitle className="text-2xl">Linked Playlists</CardTitle>
        <Badge variant="secondary">{linkedPlaylists.length} pairs</Badge>
      </div>

      <div className="grid gap-4">
        {linkedPlaylists.map((pair) => {
          const pairId = `${pair.spotify.id}-${pair.netease.id}`;
          const isLoadingThisPair = loadingPairId === pairId;

          return (
            <Card key={pairId} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <p className="font-semibold text-green-600 truncate">{pair.spotify.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pair.spotify.trackCount} tracks
                      </p>
                    </div>

                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <p className="font-semibold text-red-600 truncate">{pair.netease.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pair.netease.trackCount} tracks
                      </p>
                    </div>
                  </div>

                  <Separator orientation="vertical" className="h-12" />

                  <Button
                    onClick={() => handleStartSync(pair.spotify.id, pair.netease.id)}
                    disabled={isLoadingThisPair}
                    className="gap-2"
                  >
                    {isLoadingThisPair ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Sync
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showSyncModal && syncSpotifyPlaylist && syncNeteasePlaylist && (
        <SyncPlaylistsModal
          userId={userId}
          spotifyPlaylist={syncSpotifyPlaylist}
          neteasePlaylist={syncNeteasePlaylist}
          onClose={() => {
            setShowSyncModal(false);
            setSyncSpotifyPlaylist(null);
            setSyncNeteasePlaylist(null);
          }}
        />
      )}
    </div>
  );
});

LinkedPlaylists.displayName = "LinkedPlaylists";

export default LinkedPlaylists;
