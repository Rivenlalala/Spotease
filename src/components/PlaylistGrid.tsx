"use client";

import { useState, useEffect } from "react";
import { Platform } from "@prisma/client";
import PlaylistItem from "./PlaylistItem";

interface Playlist {
  id: string;
  name: string;
  platform: Platform;
  trackCount: number;
  cover: string | null;
}

interface PlaylistGridProps {
  userId: string;
  platform: Platform;
  onSelect?: (playlist: Playlist | null) => void;
  selectedPlaylist?: Playlist | null;
}

export default function PlaylistGrid({
  userId,
  platform,
  onSelect,
  selectedPlaylist,
}: PlaylistGridProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadPlaylists(refresh = false) {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/playlists/${platform.toLowerCase()}?userId=${userId}${refresh ? "&refresh=true" : ""}`,
      );
      if (!response.ok) {
        throw new Error("Failed to load playlists");
      }
      const data = await response.json();
      setPlaylists(data.playlists);
    } catch (error) {
      console.error("Error loading playlists:", error);
      setError("Failed to load playlists");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (userId) {
      loadPlaylists();
    }
  }, [userId, platform]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPlaylists(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {platform === Platform.SPOTIFY ? "Spotify" : "Netease"} Playlists
        </h2>
        <button
          className={`
            text-sm px-3 py-1 rounded-full border border-gray-300
            ${
    isRefreshing
      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
      : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
    }
            transition-colors duration-200
          `}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && !isRefreshing ? (
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-gray-500">Loading playlists...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-red-500">{error}</p>
        </div>
      ) : playlists.length === 0 ? (
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-gray-500">No playlists found</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {playlists.map((playlist) => (
            <PlaylistItem
              key={playlist.id}
              playlist={playlist}
              onSelect={onSelect}
              isSelected={selectedPlaylist?.id === playlist.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
