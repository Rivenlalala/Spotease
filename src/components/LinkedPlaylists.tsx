'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Platform } from '@prisma/client';
import SyncPlaylistsModal from './SyncPlaylistsModal';
import { Track } from '@/types/track';

interface LinkedPlaylist {
  spotify: {
    id: string;
    name: string;
    trackCount: number;
  };
  netease: {
    id: string;
    name: string;
    trackCount: number;
  };
  lastSynced: string;
}

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
  const [linkedPlaylists, setLinkedPlaylists] = useState<LinkedPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncSpotifyPlaylist, setSyncSpotifyPlaylist] = useState<PlaylistWithTracks | null>(null);
  const [syncNeteasePlaylist, setSyncNeteasePlaylist] = useState<PlaylistWithTracks | null>(null);

  const loadLinkedPlaylists = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/playlists/linked?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to load linked playlists');
      }
      const data = await response.json();
      setLinkedPlaylists(data.linkedPlaylists);
    } catch (error) {
      console.error('Failed to load linked playlists:', error);
      setError('Failed to load linked playlists');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLinkedPlaylists();
  }, [userId]);

  useImperativeHandle(ref, () => ({
    loadLinkedPlaylists
  }));

  const handleStartSync = async (spotifyId: string, neteaseId: string) => {
    try {
      const [spotifyResponse, neteaseResponse] = await Promise.all([
        fetch(`/api/playlists/spotify/${spotifyId}/tracks`),
        fetch(`/api/playlists/netease/${neteaseId}/tracks`)
      ]);

      if (!spotifyResponse.ok || !neteaseResponse.ok) {
        throw new Error('Failed to fetch tracks');
      }

      const [spotifyData, neteaseData] = await Promise.all([
        spotifyResponse.json(),
        neteaseResponse.json()
      ]);

      const spotifyPlaylist = linkedPlaylists.find(p => p.spotify.id === spotifyId);
      const neteasePlaylist = linkedPlaylists.find(p => p.netease.id === neteaseId);

      setSyncSpotifyPlaylist({
        id: spotifyId,
        name: spotifyPlaylist?.spotify.name || '',
        tracks: spotifyData.tracks
      });
      setSyncNeteasePlaylist({
        id: neteaseId,
        name: neteasePlaylist?.netease.name || '',
        tracks: neteaseData.tracks
      });
      setShowSyncModal(true);
    } catch (error) {
      console.error('Error loading tracks:', error);
      alert('Failed to load tracks');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
        {error}
      </div>
    );
  }

  if (linkedPlaylists.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No linked playlists</h3>
        <p className="text-gray-600">
          Link some playlists to get started with syncing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">Linked Playlists</h2>
      <div className="grid grid-cols-1 gap-4">
        {linkedPlaylists.map((pair) => (
          <div
            key={`${pair.spotify.id}-${pair.netease.id}`}
            className="bg-white rounded-lg shadow-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div>
                  <p className="font-medium text-green-600">{pair.spotify.name}</p>
                  <p className="text-sm text-gray-600">{pair.spotify.trackCount} tracks</p>
                </div>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <div>
                  <p className="font-medium text-red-600">{pair.netease.name}</p>
                  <p className="text-sm text-gray-600">{pair.netease.trackCount} tracks</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Last synced: {new Date(pair.lastSynced).toLocaleString()}
                </div>
                <button
                  onClick={() => handleStartSync(pair.spotify.id, pair.netease.id)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Sync Now
                </button>
              </div>
            </div>
          </div>
        ))}
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

export default LinkedPlaylists;
