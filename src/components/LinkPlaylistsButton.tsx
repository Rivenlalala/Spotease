"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { Playlist } from "@/types/playlist";

interface LinkPlaylistsButtonProps {
  spotifyPlaylist: Playlist | null;
  neteasePlaylist: Playlist | null;
  onLinkClick: () => Promise<void>;
  userId: string;
}

export default function LinkPlaylistsButton({
  spotifyPlaylist,
  neteasePlaylist,
  onLinkClick,
  userId,
}: LinkPlaylistsButtonProps) {
  const [isLinking, setIsLinking] = useState(false);

  if (!spotifyPlaylist || !neteasePlaylist) {
    return null;
  }

  return (
    <button
      onClick={async () => {
        setIsLinking(true);

        try {
          const response = await fetch("/api/playlists/link", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              spotifyId: spotifyPlaylist.id,
              neteaseId: neteasePlaylist.id,
              userId: userId,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to link playlists");
          }

          const data = await response.json();

          if (data.success) {
            toast.success("Playlists linked successfully!");
            onLinkClick();
          } else {
            toast.error("Failed to link playlists");
          }
        } catch (error) {
          console.error("Error linking playlists:", error);
          toast.error("Failed to link playlists");
        } finally {
          setIsLinking(false);
        }
      }}
      disabled={isLinking}
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-green-500 to-red-500 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLinking ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Linking playlists...</span>
        </>
      ) : (
        <>
          <div className="text-sm">
            <span className="font-medium">{spotifyPlaylist.name}</span>
            <span className="mx-2">⟷</span>
            <span className="font-medium">{neteasePlaylist.name}</span>
          </div>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </>
      )}
    </button>
  );
}
