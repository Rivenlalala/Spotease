"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Check, ArrowRight, Search, RefreshCw, Loader2 } from "lucide-react";
import TrackSearchModal from "./TrackSearchModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Track, TrackPairingInfo } from "@/types/track";

interface SyncPlaylistsModalProps {
  userId: string;
  spotifyPlaylist: {
    id: string;
    name: string;
    tracks: Track[];
  };
  neteasePlaylist: {
    id: string;
    name: string;
    tracks: Track[];
  };
  pairingId: string;
  onClose: () => void;
}

interface TrackPair {
  spotifyTrack?: Track;
  neteaseTrack?: Track;
  confidence?: number;
  isPersisted?: boolean; // True if pairing is stored in DB
}

type SearchPlatform = "SPOTIFY" | "NETEASE";

function calculateMatchConfidence(spotifyTrack: Track, neteaseTrack: Track): number {
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/\(?(?:feat|ft|featuring)\.?\s+[^)]+\)?/g, "")
      .replace(/\([^)]+\)/g, "")
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const spotifyName = normalize(spotifyTrack.name);
  const neteaseName = normalize(neteaseTrack.name);
  const spotifyArtist = normalize(spotifyTrack.artist);
  const neteaseArtist = normalize(neteaseTrack.artist);

  const exactNameMatch = spotifyName === neteaseName ? 0.2 : 0;
  const exactArtistMatch = spotifyArtist === neteaseArtist ? 0.2 : 0;

  const nameDistance = levenshteinDistance(spotifyName, neteaseName);
  const artistDistance = levenshteinDistance(spotifyArtist, neteaseArtist);

  const nameSimilarity = 1 - nameDistance / Math.max(spotifyName.length, neteaseName.length, 1);
  const artistSimilarity =
    1 - artistDistance / Math.max(spotifyArtist.length, neteaseArtist.length, 1);

  const confidence = nameSimilarity * 0.6 + artistSimilarity * 0.4 + exactNameMatch + exactArtistMatch;

  return Math.min(confidence, 1);
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j - 1] + 1, dp[i - 1][j] + 1, dp[i][j - 1] + 1);
      }
    }
  }

  return dp[m][n];
}

export default function SyncPlaylistsModal({
  userId,
  spotifyPlaylist,
  neteasePlaylist,
  pairingId: _pairingId,
  onClose,
}: SyncPlaylistsModalProps) {
  const [trackPairs, setTrackPairs] = useState<TrackPair[]>([]);
  const [trackPairings, setTrackPairings] = useState<TrackPairingInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchPlatform, setSearchPlatform] = useState<SearchPlatform>("NETEASE");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const [localSpotifyTracks, setLocalSpotifyTracks] = useState(spotifyPlaylist.tracks);
  const [localNeteaseTracks, setLocalNeteaseTracks] = useState(neteasePlaylist.tracks);

  // Fetch stored track pairings from DB
  useEffect(() => {
    const fetchPairings = async () => {
      try {
        const response = await fetch("/api/tracks/pair");
        if (response.ok) {
          const { pairings } = await response.json();
          setTrackPairings(pairings);
        }
      } catch (error) {
        console.error("Failed to fetch track pairings:", error);
      }
    };

    fetchPairings();
  }, []);

  // Build track pairs using stored pairings first, then string similarity
  useEffect(() => {
    const pairs: TrackPair[] = [];
    const pairedSpotifyIds = new Set<string>();
    const pairedNeteaseIds = new Set<string>();

    // Create maps for quick lookup
    const _spotifyTrackMap = new Map(localSpotifyTracks.map((t) => [t.id, t]));
    const neteaseTrackMap = new Map(localNeteaseTracks.map((t) => [t.id, t]));

    // Create pairing maps from DB
    const spotifyToNetease = new Map(trackPairings.map((p) => [p.spotifyTrackId, p.neteaseTrackId]));
    const _neteaseToSpotify = new Map(trackPairings.map((p) => [p.neteaseTrackId, p.spotifyTrackId]));

    // First pass: Match using stored pairings
    localSpotifyTracks.forEach((spotifyTrack) => {
      const pairedNeteaseId = spotifyToNetease.get(spotifyTrack.id);
      if (pairedNeteaseId) {
        const neteaseTrack = neteaseTrackMap.get(pairedNeteaseId);
        if (neteaseTrack) {
          pairs.push({
            spotifyTrack,
            neteaseTrack,
            confidence: 1,
            isPersisted: true,
          });
          pairedSpotifyIds.add(spotifyTrack.id);
          pairedNeteaseIds.add(pairedNeteaseId);
        }
      }
    });

    // Second pass: Match unpaired tracks using string similarity
    localSpotifyTracks
      .filter((t) => !pairedSpotifyIds.has(t.id))
      .forEach((spotifyTrack) => {
        let bestMatch: Track | undefined;
        let bestConfidence = 0;

        localNeteaseTracks
          .filter((t) => !pairedNeteaseIds.has(t.id))
          .forEach((neteaseTrack) => {
            const confidence = calculateMatchConfidence(spotifyTrack, neteaseTrack);
            if (confidence > 0.8 && confidence > bestConfidence) {
              bestMatch = neteaseTrack;
              bestConfidence = confidence;
            }
          });

        pairs.push({
          spotifyTrack,
          neteaseTrack: bestMatch,
          confidence: bestMatch ? bestConfidence : undefined,
          isPersisted: false,
        });

        if (bestMatch) {
          pairedNeteaseIds.add(bestMatch.id);
        }
        pairedSpotifyIds.add(spotifyTrack.id);
      });

    // Third pass: Add unmatched NetEase tracks
    localNeteaseTracks
      .filter((track) => !pairedNeteaseIds.has(track.id))
      .forEach((track) => {
        pairs.push({
          neteaseTrack: track,
          confidence: undefined,
          isPersisted: false,
        });
      });

    setTrackPairs(pairs);
    setIsLoading(false);
  }, [localSpotifyTracks, localNeteaseTracks, trackPairings]);

  const handleRefreshTracks = async () => {
    setIsRefreshing(true);
    try {
      const [spotifyResponse, neteaseResponse] = await Promise.all([
        fetch(`/api/playlists/spotify/${spotifyPlaylist.id}/tracks?userId=${userId}`),
        fetch(`/api/playlists/netease/${neteasePlaylist.id}/tracks?userId=${userId}`),
      ]);

      if (!spotifyResponse.ok || !neteaseResponse.ok) {
        throw new Error("Failed to refresh tracks");
      }

      const [spotifyData, neteaseData] = await Promise.all([
        spotifyResponse.json(),
        neteaseResponse.json(),
      ]);

      setLocalSpotifyTracks(spotifyData.tracks);
      setLocalNeteaseTracks(neteaseData.tracks);
      toast.success("Tracks refreshed");
    } catch (error) {
      console.error("Failed to refresh tracks:", error);
      toast.error("Failed to refresh tracks");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTrackAdd = useCallback((track: Track, platform: SearchPlatform) => {
    if (platform === "SPOTIFY") {
      setLocalSpotifyTracks((prev) => [...prev, track]);
    } else {
      setLocalNeteaseTracks((prev) => [...prev, track]);
    }
  }, []);

  const handlePairTracks = useCallback(
    async (spotifyTrackId: string, neteaseTrackId: string) => {
      try {
        const response = await fetch("/api/tracks/pair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spotifyTrackId, neteaseTrackId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to pair tracks");
        }

        // Add to local pairings cache
        setTrackPairings((prev) => [...prev, { id: "", spotifyTrackId, neteaseTrackId }]);

        toast.success("Tracks paired successfully");
      } catch (error) {
        console.error("Failed to pair tracks:", error);
        if (error instanceof Error && error.message.includes("already paired")) {
          toast.error("Track is already paired with another track");
        } else {
          toast.error("Failed to pair tracks");
        }
        throw error;
      }
    },
    [],
  );

  const matchedCount = trackPairs.filter((p) => p.confidence && p.confidence > 0.8).length;
  const unmatchedCount = trackPairs.length - matchedCount;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Sync Playlists</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshTracks}
                disabled={isRefreshing}
                className="gap-2"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                {matchedCount} matched
              </Badge>
              <Badge variant="secondary">{unmatchedCount} unmatched</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex justify-between items-center py-4 border-b">
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <h3 className="font-semibold text-green-600">Spotify</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{spotifyPlaylist.name}</p>
            <p className="text-xs text-muted-foreground">{localSpotifyTracks.length} tracks</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground mx-4" />
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <h3 className="font-semibold text-red-600">Netease</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{neteasePlaylist.name}</p>
            <p className="text-xs text-muted-foreground">{localNeteaseTracks.length} tracks</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 space-y-3 py-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[calc(90vh-280px)] pr-4">
            <div className="space-y-2 py-4">
              {trackPairs.map((pair, index) => (
                <div
                  key={`${pair.spotifyTrack?.id || "no-spotify"}-${pair.neteaseTrack?.id || "no-netease"}-${index}`}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                    pair.confidence && pair.confidence > 0.8
                      ? pair.isPersisted
                        ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900"
                        : "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                      : "bg-muted/50 border-border",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    {pair.spotifyTrack ? (
                      <div>
                        <p className="font-medium truncate">{pair.spotifyTrack.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {pair.spotifyTrack.artist}
                        </p>
                      </div>
                    ) : (
                      pair.neteaseTrack && (
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full gap-2 bg-green-600 hover:bg-green-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrack(pair.neteaseTrack!);
                            setSearchPlatform("SPOTIFY");
                            setShowSearchModal(true);
                          }}
                        >
                          <Search className="h-4 w-4" />
                          Find on Spotify
                        </Button>
                      )
                    )}
                  </div>

                  <div className="flex-shrink-0 w-12 flex justify-center">
                    {pair.confidence && pair.confidence > 0.8 ? (
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          pair.isPersisted
                            ? "bg-blue-100 dark:bg-blue-900"
                            : "bg-green-100 dark:bg-green-900",
                        )}
                        title={pair.isPersisted ? "Manually paired" : "Auto-matched"}
                      >
                        <Check
                          className={cn(
                            "h-5 w-5",
                            pair.isPersisted
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-green-600 dark:text-green-400",
                          )}
                        />
                      </div>
                    ) : (
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {pair.neteaseTrack ? (
                      <div>
                        <p className="font-medium truncate">{pair.neteaseTrack.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {pair.neteaseTrack.artist}
                        </p>
                      </div>
                    ) : (
                      pair.spotifyTrack && (
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full gap-2 bg-red-600 hover:bg-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrack(pair.spotifyTrack!);
                            setSearchPlatform("NETEASE");
                            setShowSearchModal(true);
                          }}
                        >
                          <Search className="h-4 w-4" />
                          Find on Netease
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>

      {showSearchModal && selectedTrack && (
        <TrackSearchModal
          userId={userId}
          platform={searchPlatform}
          sourceTrack={selectedTrack}
          playlistId={searchPlatform === "SPOTIFY" ? spotifyPlaylist.id : neteasePlaylist.id}
          onSelect={async (track: Track) => {
            try {
              // Add track to playlist first
              handleTrackAdd(track, searchPlatform);

              // Pair the tracks (store in DB)
              const spotifyTrackId =
                searchPlatform === "SPOTIFY" ? track.id : selectedTrack.id;
              const neteaseTrackId =
                searchPlatform === "NETEASE" ? track.id : selectedTrack.id;

              await handlePairTracks(spotifyTrackId, neteaseTrackId);

              // Update local state to show pairing
              setTrackPairs((pairs) => {
                const updatedPairs = [...pairs];
                const pairIndex = pairs.findIndex(
                  (p) =>
                    (p.spotifyTrack?.id === selectedTrack.id && !p.neteaseTrack) ||
                    (p.neteaseTrack?.id === selectedTrack.id && !p.spotifyTrack),
                );

                if (pairIndex !== -1) {
                  if (searchPlatform === "SPOTIFY") {
                    updatedPairs[pairIndex] = {
                      ...updatedPairs[pairIndex],
                      spotifyTrack: track,
                      confidence: 1,
                      isPersisted: true,
                    };
                  } else {
                    updatedPairs[pairIndex] = {
                      ...updatedPairs[pairIndex],
                      neteaseTrack: track,
                      confidence: 1,
                      isPersisted: true,
                    };
                  }
                }

                return updatedPairs;
              });

              setShowSearchModal(false);
              setSelectedTrack(null);
            } catch {
              // Error already handled in handlePairTracks
              setShowSearchModal(false);
              setSelectedTrack(null);
            }
          }}
          onClose={() => {
            setShowSearchModal(false);
            setSelectedTrack(null);
          }}
        />
      )}
    </Dialog>
  );
}
