"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { ArrowRight, RefreshCw, Link2Off, AlertCircle, Loader2, Trash2 } from "lucide-react";
import SyncPlaylistsModal from "./SyncPlaylistsModal";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { Track } from "@/types/track";
import type { PlaylistPair } from "@/types/playlist";

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
}

const LinkedPlaylists = forwardRef<LinkedPlaylistsRef, LinkedPlaylistsProps>(({ userId }, ref) => {
  const [linkedPlaylists, setLinkedPlaylists] = useState<PlaylistPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncSpotifyPlaylist, setSyncSpotifyPlaylist] = useState<PlaylistWithTracks | null>(null);
  const [syncNeteasePlaylist, setSyncNeteasePlaylist] = useState<PlaylistWithTracks | null>(null);
  const [currentPairingId, setCurrentPairingId] = useState<string | null>(null);
  const [loadingPairId, setLoadingPairId] = useState<string | null>(null);
  const [deletingPairId, setDeletingPairId] = useState<string | null>(null);

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
  }));

  const handleStartSync = async (pair: PlaylistPair) => {
    setLoadingPairId(pair.pairingId);
    try {
      // Fetch fresh tracks from both platforms in parallel
      const [spotifyResponse, neteaseResponse] = await Promise.all([
        fetch(`/api/playlists/spotify/${pair.spotify.id}/tracks?userId=${userId}`),
        fetch(`/api/playlists/netease/${pair.netease.id}/tracks?userId=${userId}`),
      ]);

      if (!spotifyResponse.ok || !neteaseResponse.ok) {
        throw new Error("Failed to fetch tracks");
      }

      const [spotifyData, neteaseData] = await Promise.all([
        spotifyResponse.json(),
        neteaseResponse.json(),
      ]);

      setSyncSpotifyPlaylist({
        id: pair.spotify.id,
        name: pair.spotify.name,
        tracks: spotifyData.tracks,
      });
      setSyncNeteasePlaylist({
        id: String(pair.netease.id),
        name: pair.netease.name,
        tracks: neteaseData.tracks,
      });
      setCurrentPairingId(pair.pairingId);
      setShowSyncModal(true);
    } catch (error) {
      console.error("Error loading tracks:", error);
      alert("Failed to load tracks. Please try again.");
    } finally {
      setLoadingPairId(null);
    }
  };

  const handleUnlink = async (pairingId: string) => {
    if (!confirm("Are you sure you want to unlink these playlists?")) {
      return;
    }

    setDeletingPairId(pairingId);
    try {
      const response = await fetch("/api/playlists/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingId }),
      });

      if (!response.ok) {
        throw new Error("Failed to unlink playlists");
      }

      // Remove from local state
      setLinkedPlaylists((prev) => prev.filter((p) => p.pairingId !== pairingId));
    } catch (error) {
      console.error("Error unlinking playlists:", error);
      alert("Failed to unlink playlists. Please try again.");
    } finally {
      setDeletingPairId(null);
    }
  };

  const handleSyncModalClose = () => {
    setShowSyncModal(false);
    setSyncSpotifyPlaylist(null);
    setSyncNeteasePlaylist(null);
    setCurrentPairingId(null);
    // Reload to get fresh track counts from APIs
    loadLinkedPlaylists();
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
          const isLoadingThisPair = loadingPairId === pair.pairingId;
          const isDeletingThisPair = deletingPairId === pair.pairingId;

          return (
            <Card key={pair.pairingId} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <p className="font-semibold text-green-600 truncate">{pair.spotify.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pair.spotify.tracks.total} tracks
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

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleStartSync(pair)}
                      disabled={isLoadingThisPair || isDeletingThisPair}
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
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleUnlink(pair.pairingId)}
                      disabled={isLoadingThisPair || isDeletingThisPair}
                      className="text-destructive hover:text-destructive"
                    >
                      {isDeletingThisPair ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showSyncModal && syncSpotifyPlaylist && syncNeteasePlaylist && currentPairingId && (
        <SyncPlaylistsModal
          userId={userId}
          spotifyPlaylist={syncSpotifyPlaylist}
          neteasePlaylist={syncNeteasePlaylist}
          pairingId={currentPairingId}
          onClose={handleSyncModalClose}
        />
      )}
    </div>
  );
});

LinkedPlaylists.displayName = "LinkedPlaylists";

export default LinkedPlaylists;
