"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import TrackSearchModal from "./TrackSearchModal";
import { Track } from "@/types/track";

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
  onClose: () => void;
  onPlaylistsUpdated?: () => void;
}

interface TrackPair {
  spotifyTrack?: Track;
  neteaseTrack?: Track;
  confidence?: number;
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

  const nameSimilarity = 1 - nameDistance / Math.max(spotifyName.length, neteaseName.length);
  const artistSimilarity = 1 - artistDistance / Math.max(spotifyArtist.length, neteaseArtist.length);

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
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
        );
      }
    }
  }

  return dp[m][n];
}

export default function SyncPlaylistsModal({
  userId,
  spotifyPlaylist,
  neteasePlaylist,
  onClose,
  onPlaylistsUpdated,
}: SyncPlaylistsModalProps) {
  const [trackPairs, setTrackPairs] = useState<TrackPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchPlatform, setSearchPlatform] = useState<SearchPlatform>("NETEASE");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  
  // Keep local copies of playlist data
  const [localSpotifyTracks, setLocalSpotifyTracks] = useState(spotifyPlaylist.tracks);
  const [localNeteaseTracks, setLocalNeteaseTracks] = useState(neteasePlaylist.tracks);

  // Initialize track pairs
  useEffect(() => {
    const pairs: TrackPair[] = [];
    const pairedNeteaseIds = new Set<string>();

    localSpotifyTracks.forEach((spotifyTrack) => {
      let bestMatch: Track | undefined;
      let bestConfidence = 0;

      localNeteaseTracks.forEach((neteaseTrack) => {
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
      });

      if (bestMatch) {
        pairedNeteaseIds.add(bestMatch.id);
      }
    });

    localNeteaseTracks
      .filter((track) => !pairedNeteaseIds.has(track.id))
      .forEach((track) => {
        pairs.push({
          neteaseTrack: track,
          confidence: undefined,
        });
      });

    setTrackPairs(pairs);
    setIsLoading(false);
  }, [localSpotifyTracks, localNeteaseTracks]);

  const handleTrackAdd = useCallback(
    (track: Track, platform: SearchPlatform) => {
      // Update local playlist tracks
      if (platform === "SPOTIFY") {
        setLocalSpotifyTracks(prev => [...prev, track]);
      } else {
        setLocalNeteaseTracks(prev => [...prev, track]);
      }
    },
    [],
  );

  const handlePairTracks = useCallback(
    async (sourceTrackId: string, targetTrackId: string, platform: SearchPlatform) => {
      try {
        const response = await fetch("/api/tracks/pair", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceTrackId,
            targetTrackId,
            platform,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to pair tracks");
        }

        const data = await response.json();

        // Update track pairs locally
        setTrackPairs((pairs) => {
          const updatedPairs = [...pairs];
          const pairIndex = pairs.findIndex(
            (p) =>
              (p.spotifyTrack?.id === sourceTrackId && !p.neteaseTrack) ||
              (p.neteaseTrack?.id === sourceTrackId && !p.spotifyTrack),
          );

          if (pairIndex !== -1) {
            const spotifyTrack = platform === "SPOTIFY" ? data.pairedTracks.spotify : data.pairedTracks.netease;
            const neteaseTrack = platform === "NETEASE" ? data.pairedTracks.netease : data.pairedTracks.spotify;
            
            updatedPairs[pairIndex] = {
              spotifyTrack,
              neteaseTrack,
              confidence: 1,
            };
          }

          return updatedPairs;
        });

        // Notify parent of successful update
        onPlaylistsUpdated?.();
        
        toast.success("Tracks paired successfully");
      } catch (error) {
        console.error("Failed to pair tracks:", error);
        toast.error("Failed to pair tracks");
      }
    },
    [onPlaylistsUpdated],
  );

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
        <div className="bg-white rounded-lg p-8">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }  

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center overflow-auto z-[100]">
      <div className="bg-white rounded-lg p-8 m-8 max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Sync Playlists</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex-1 text-center">
            <h3 className="font-medium text-green-600">Spotify</h3>
            <p className="text-sm text-gray-600">{spotifyPlaylist.name}</p>
          </div>
          <div className="flex-1 text-center">
            <h3 className="font-medium text-red-600">Netease</h3>
            <p className="text-sm text-gray-600">{neteasePlaylist.name}</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="space-y-2">
            {trackPairs.map((pair) => (
              <div
                key={pair.spotifyTrack?.id || pair.neteaseTrack?.id}
                className={`flex items-center space-x-4 p-3 rounded-lg ${
                  pair.confidence && pair.confidence > 0.8 ? "bg-green-50" : "bg-gray-50"
                }`}
              >
                <div className="flex-1">
                  {pair.spotifyTrack ? (
                    <div>
                      <p className="font-medium truncate">{pair.spotifyTrack.name}</p>
                      <p className="text-sm text-gray-600 truncate">{pair.spotifyTrack.artist}</p>
                    </div>
                  ) : (
                    pair.neteaseTrack && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrack(pair.neteaseTrack!);
                          setSearchPlatform("SPOTIFY");
                          setShowSearchModal(true);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors w-full"
                      >
                        Find on Spotify
                      </button>
                    )
                  )}
                </div>

                <div className="flex-shrink-0 w-16 flex justify-center">
                  {pair.confidence && pair.confidence > 0.8 ? (
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex-1">
                  {pair.neteaseTrack ? (
                    <div>
                      <p className="font-medium truncate">{pair.neteaseTrack.name}</p>
                      <p className="text-sm text-gray-600 truncate">{pair.neteaseTrack.artist}</p>
                    </div>
                  ) : (
                    pair.spotifyTrack && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrack(pair.spotifyTrack!);
                          setSearchPlatform("NETEASE");
                          setShowSearchModal(true);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors w-full"
                      >
                        Find on Netease
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showSearchModal && selectedTrack && (
        <TrackSearchModal
          userId={userId}
          platform={searchPlatform}
          sourceTrack={selectedTrack}
          playlistId={searchPlatform === "SPOTIFY" ? spotifyPlaylist.id : neteasePlaylist.id}
          onSelect={async (track: Track) => {
            // First update local state
            handleTrackAdd(track, searchPlatform);
            
            // Then pair the tracks
            await handlePairTracks(selectedTrack.id, track.id, searchPlatform);

            // Update track pairs with new track
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
                  };
                } else {
                  updatedPairs[pairIndex] = {
                    ...updatedPairs[pairIndex],
                    neteaseTrack: track,
                    confidence: 1,
                  };
                }
              }

              return updatedPairs;
            });

            // If playlists were successfully updated, notify parent
            onPlaylistsUpdated?.();
            
            setShowSearchModal(false);
            setSelectedTrack(null);
          }}
          onClose={() => {
            setShowSearchModal(false);
            setSelectedTrack(null);
          }}
        />
      )}
    </div>
  );
}
