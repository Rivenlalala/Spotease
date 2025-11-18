"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Music2, AlertCircle } from "lucide-react";
import PlaylistItem from "./PlaylistItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { type Playlist } from "@/types/playlist";

type Platform = "SPOTIFY" | "NETEASE";

interface PlaylistGridProps {
  userId: string;
  platform: Platform;
  onSelect?: React.Dispatch<React.SetStateAction<Playlist | null>>;
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

  const loadPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/playlists/${platform.toLowerCase()}?userId=${userId}`);
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
  }, [platform, userId]);

  useEffect(() => {
    if (userId) {
      loadPlaylists();
    }
  }, [userId, platform, loadPlaylists]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPlaylists();
  };

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
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${config.color}`} />
            <CardTitle className="text-xl">{config.name} Playlists</CardTitle>
            {!loading && (
              <Badge variant="secondary" className="ml-2">
                {playlists.length}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading && !isRefreshing ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-14 w-14 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadPlaylists()} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Music2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No playlists found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create some playlists in {config.name} to get started
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {playlists.map((playlist) => (
                <PlaylistItem
                  key={playlist.id}
                  playlist={playlist}
                  onSelect={onSelect}
                  isSelected={selectedPlaylist?.id === playlist.id}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
