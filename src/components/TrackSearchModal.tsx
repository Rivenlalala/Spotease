'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from '@prisma/client';
import { Track } from '@/types/track';

interface TrackSearchModalProps {
  onSelect: (track: Track) => void;
  onClose: () => void;
  userId: string;
  platform: Platform;
  sourceTrack?: Track;  // Track from the other platform to search for
  playlistId: string;  // ID of the playlist to add tracks to
}

export default function TrackSearchModal({
  onSelect,
  onClose,
  userId,
  platform,
  sourceTrack,
  playlistId
}: TrackSearchModalProps): ReactNode {
  // Initialize query with source track info if available
  const initialQuery = sourceTrack ? `${sourceTrack.name} ${sourceTrack.artist}` : '';
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);

  const handleSearch = useCallback(async (forceRefresh?: boolean) => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const url = new URL(`/api/tracks/search`, window.location.origin);
      url.searchParams.set('platform', platform);
      url.searchParams.set('query', query);
      url.searchParams.set('userId', userId);
      if (forceRefresh) {
        url.searchParams.set('refresh', 'true');
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to search tracks');
      }
      const data = await response.json();
      setSearchResults(data.tracks);
    } catch (error) {
      console.error('Failed to search tracks:', error);
    } finally {
      setIsSearching(false);
    }
  }, [query, platform, userId]);

  // Auto-search when component mounts if we have a source track
  useEffect(() => {
    if (sourceTrack) {
      handleSearch();
    }
  }, [sourceTrack, handleSearch]);

  async function handleTrackSelect(track: Track) {
    setIsAdding(true);
    try {
      // Add track to playlist
      const response = await fetch(`/api/playlists/${platform.toLowerCase()}/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackIds: [track.id],
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add track to playlist');
      }

      // Refresh search results to reflect the new pairing
      await handleSearch(true);
      
      // Call onSelect to update UI
      onSelect(track);
    } catch (error) {
      console.error('Failed to add track:', error);
      alert('Failed to add track to playlist');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Search {platform === 'SPOTIFY' ? 'Spotify' : 'Netease'} Tracks</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex space-x-2 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by song name or artist..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => handleSearch()}
            disabled={isSearching || !query.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSearching ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </div>

        <div className="max-h-96 overflow-auto">
          {searchResults.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {query.trim() ? 'No results found' : 'Search for a track to get started'}
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map(track => (
                <button
                  key={track.id}
                  onClick={() => handleTrackSelect(track)}
                  disabled={isAdding}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <p className="font-medium">{track.name}</p>
                  <p className="text-sm text-gray-600">
                    {track.artist} • {track.album}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
