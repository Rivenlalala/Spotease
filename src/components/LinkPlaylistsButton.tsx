"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <Card className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform bg-gradient-to-r from-green-500 to-red-500 p-1 shadow-2xl">
      <Button
        onClick={async () => {
          setIsLinking(true);

          try {
            const response = await fetch("/api/playlists/link", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                spotifyPlaylistId: spotifyPlaylist.id,
                neteasePlaylistId: neteasePlaylist.id,
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
        variant="secondary"
        size="lg"
        className="gap-3 bg-white px-6 py-6 text-base font-medium shadow-none hover:bg-gray-50"
      >
        {isLinking ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Linking playlists...</span>
          </>
        ) : (
          <>
            <span className="max-w-[200px] truncate font-semibold text-green-600">
              {spotifyPlaylist.name}
            </span>
            <Link2 className="h-5 w-5 text-muted-foreground" />
            <span className="max-w-[200px] truncate font-semibold text-red-600">
              {neteasePlaylist.name}
            </span>
          </>
        )}
      </Button>
    </Card>
  );
}
