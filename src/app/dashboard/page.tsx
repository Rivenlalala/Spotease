"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Platform } from "@prisma/client";
import { toast } from "react-hot-toast";
import { CheckCircle2, AlertCircle, Loader2, LogOut } from "lucide-react";
import { User } from "@/types/user";
import NeteaseQRLoginModal from "@/components/NeteaseQRLoginModal";
import PlaylistGrid from "@/components/PlaylistGrid";
import LinkPlaylistsButton from "@/components/LinkPlaylistsButton";
import LinkedPlaylists, { LinkedPlaylistsRef } from "@/components/LinkedPlaylists";
import SyncPlaylistsModal from "@/components/SyncPlaylistsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Track } from "@/types/track";
import { type Playlist } from "@/types/playlist";

interface PlaylistWithTracks {
  id: string;
  name: string;
  tracks: Track[];
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("userId");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNeteaseModal, setShowNeteaseModal] = useState(false);
  const [selectedSpotifyPlaylist, setSelectedSpotifyPlaylist] = useState<Playlist | null>(null);
  const [selectedNeteasePlaylist, setSelectedNeteasePlaylist] = useState<Playlist | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncSpotifyPlaylist, setSyncSpotifyPlaylist] = useState<PlaylistWithTracks | null>(null);
  const [syncNeteasePlaylist, setSyncNeteasePlaylist] = useState<PlaylistWithTracks | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadUser = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error("Failed to load user:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Logged out successfully");
        router.push("/");
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  const linkedPlaylistsRef = useRef<LinkedPlaylistsRef>(null);

  async function handleLinkPlaylists() {
    if (!selectedSpotifyPlaylist || !selectedNeteasePlaylist) return;

    try {
      const response = await fetch("/api/playlists/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spotifyId: selectedSpotifyPlaylist.id,
          neteaseId: selectedNeteasePlaylist.id,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to link playlists");
      }

      linkedPlaylistsRef.current?.loadLinkedPlaylists();

      const [spotifyResponse, neteaseResponse] = await Promise.all([
        fetch(`/api/playlists/spotify/${selectedSpotifyPlaylist.id}/tracks`),
        fetch(`/api/playlists/netease/${selectedNeteasePlaylist.id}/tracks`),
      ]);

      if (!spotifyResponse.ok || !neteaseResponse.ok) {
        throw new Error("Failed to fetch tracks");
      }

      const [spotifyData, neteaseData] = await Promise.all([
        spotifyResponse.json(),
        neteaseResponse.json(),
      ]);

      setSyncSpotifyPlaylist({
        id: selectedSpotifyPlaylist.id,
        name: selectedSpotifyPlaylist.name,
        tracks: spotifyData.tracks,
      });
      setSyncNeteasePlaylist({
        id: selectedNeteasePlaylist.id,
        name: selectedNeteasePlaylist.name,
        tracks: neteaseData.tracks,
      });
      setShowSyncModal(true);

      setSelectedSpotifyPlaylist(null);
      setSelectedNeteasePlaylist(null);
    } catch (error) {
      console.error("Error linking playlists:", error);
      toast.error("Failed to link playlists");
    }
  }

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-lg font-medium text-destructive">User ID is required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-lg text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-lg font-medium text-destructive">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
                <AvatarFallback className="text-lg">
                  {user.name?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{user.name ?? "Anonymous"}</h1>
                {user.email && <p className="text-muted-foreground">{user.email}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  Dashboard
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="gap-2"
                >
                  {loggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                Spotify Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.spotifyId ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="gap-1 bg-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                  <span className="text-sm text-muted-foreground">ID: {user.spotifyId}</span>
                </div>
              ) : (
                <Button asChild className="gap-2 bg-green-600 hover:bg-green-700">
                  <a href="/api/auth/spotify">Connect Spotify</a>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                Netease Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.neteaseId ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="gap-1 bg-red-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </Badge>
                  </div>
                  {(user.neteaseAvatar || user.neteaseName) && (
                    <div className="flex items-center gap-3">
                      {user.neteaseAvatar && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={user.neteaseAvatar}
                            alt={user.neteaseName ?? "Netease"}
                          />
                          <AvatarFallback>N</AvatarFallback>
                        </Avatar>
                      )}
                      {user.neteaseName && (
                        <span className="text-sm text-muted-foreground">{user.neteaseName}</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => setShowNeteaseModal(true)}
                  className="gap-2 bg-red-600 hover:bg-red-700"
                >
                  Connect Netease
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {user.spotifyId && user.neteaseId && (
          <Card>
            <CardContent className="p-6">
              <LinkedPlaylists userId={userId} ref={linkedPlaylistsRef} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {user.spotifyId && (
            <PlaylistGrid
              userId={userId}
              platform={Platform.SPOTIFY}
              onSelect={setSelectedSpotifyPlaylist}
              selectedPlaylist={selectedSpotifyPlaylist}
            />
          )}

          {user.neteaseId && (
            <PlaylistGrid
              userId={userId}
              platform={Platform.NETEASE}
              onSelect={setSelectedNeteasePlaylist}
              selectedPlaylist={selectedNeteasePlaylist}
            />
          )}
        </div>
      </div>

      <NeteaseQRLoginModal
        isOpen={showNeteaseModal}
        onClose={() => setShowNeteaseModal(false)}
        userId={userId}
        onSuccess={() => {
          setShowNeteaseModal(false);
          loadUser();
        }}
      />

      <LinkPlaylistsButton
        spotifyPlaylist={selectedSpotifyPlaylist}
        neteasePlaylist={selectedNeteasePlaylist}
        onLinkClick={handleLinkPlaylists}
        userId={userId}
      />

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
          onPlaylistsUpdated={() => linkedPlaylistsRef.current?.loadLinkedPlaylists()}
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-[600px] w-full" />
              <Skeleton className="h-[600px] w-full" />
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
