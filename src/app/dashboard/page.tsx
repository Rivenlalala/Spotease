"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Platform } from "@prisma/client";
import { User } from "@/types/user";
import NeteaseQRLoginModal from "@/components/NeteaseQRLoginModal";
import PlaylistGrid from "@/components/PlaylistGrid";
import LinkPlaylistsButton from "@/components/LinkPlaylistsButton";
import LinkedPlaylists, { LinkedPlaylistsRef } from "@/components/LinkedPlaylists";
import SyncPlaylistsModal from "@/components/SyncPlaylistsModal";
import { Track } from "@/types/track";
import { type Playlist } from "@/types/playlist";

interface PlaylistWithTracks {
  id: string;
  name: string;
  tracks: Track[];
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNeteaseModal, setShowNeteaseModal] = useState(false);
  const [selectedSpotifyPlaylist, setSelectedSpotifyPlaylist] = useState<Playlist | null>(null);
  const [selectedNeteasePlaylist, setSelectedNeteasePlaylist] = useState<Playlist | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncSpotifyPlaylist, setSyncSpotifyPlaylist] = useState<PlaylistWithTracks | null>(null);
  const [syncNeteasePlaylist, setSyncNeteasePlaylist] = useState<PlaylistWithTracks | null>(null);

  async function loadUser() {
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
  }

  useEffect(() => {
    loadUser();
  }, [userId]);

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

      // Refresh linked playlists
      linkedPlaylistsRef.current?.loadLinkedPlaylists();

      // Now fetch tracks for sync modal
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

      // Set playlists with tracks and show sync modal
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

      // Reset selections
      setSelectedSpotifyPlaylist(null);
      setSelectedNeteasePlaylist(null);
    } catch (error) {
      console.error("Error linking playlists:", error);
      alert("Failed to link playlists");
    }
  }

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl text-red-500">User ID is required</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl text-red-500">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* User Profile */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-4">
            {user.image && (
              <img src={user.image ?? undefined} alt={user.name ?? undefined} className="w-16 h-16 rounded-full" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{user.name ?? "Anonymous"}</h1>
              {user.email && <p className="text-gray-600">{user.email}</p>}
            </div>
          </div>
        </div>

        {/* Service Connections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Spotify Account</h2>
            {user.spotifyId ? (
              <p className="text-green-600">✓ Connected</p>
            ) : (
              <a
                href="/api/auth/spotify"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full inline-block"
              >
                Connect Spotify
              </a>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Netease Account</h2>
            {user.neteaseId ? (
              <div className="space-y-2">
                <p className="text-green-600">✓ Connected</p>
                <div className="flex items-center space-x-3">
                  {user.neteaseAvatar && (
                    <img
                      src={user.neteaseAvatar}
                      alt={user.neteaseName ?? "Netease Avatar"}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  {user.neteaseName && <p className="text-sm text-gray-600">{user.neteaseName}</p>}
                </div>
              </div>
            ) : (
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full"
                onClick={() => setShowNeteaseModal(true)}
              >
                Connect Netease
              </button>
            )}
          </div>
        </div>

        {/* Linked Playlists */}
        {user.spotifyId && user.neteaseId && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <LinkedPlaylists userId={userId} ref={linkedPlaylistsRef} />
          </div>
        )}

        {/* Playlists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {user.spotifyId && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <PlaylistGrid
                userId={userId}
                platform={Platform.SPOTIFY}
                onSelect={setSelectedSpotifyPlaylist}
                selectedPlaylist={selectedSpotifyPlaylist}
              />
            </div>
          )}

          {user.neteaseId && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <PlaylistGrid
                userId={userId}
                platform={Platform.NETEASE}
                onSelect={setSelectedNeteasePlaylist}
                selectedPlaylist={selectedNeteasePlaylist}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NeteaseQRLoginModal
        isOpen={showNeteaseModal}
        onClose={() => setShowNeteaseModal(false)}
        userId={userId}
        onSuccess={() => {
          setShowNeteaseModal(false);
          loadUser();
        }}
      />

      {/* Link Button */}
      <LinkPlaylistsButton
        spotifyPlaylist={selectedSpotifyPlaylist}
        neteasePlaylist={selectedNeteasePlaylist}
        onLinkClick={handleLinkPlaylists}
        userId={userId}
      />

      {/* Sync Modal */}
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
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
