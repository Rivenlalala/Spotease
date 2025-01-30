'use client';

import { Platform } from '@prisma/client';
import { Playlist } from '@/types/playlist';

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
  userId
}: LinkPlaylistsButtonProps) {
  if (!spotifyPlaylist || !neteasePlaylist) {
    return null;
  }

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <button
        onClick={async () => {
          try {
            const response = await fetch('/api/playlists/link', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                spotifyId: spotifyPlaylist.id,
                neteaseId: neteasePlaylist.id,
                userId: userId
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to link playlists');
            }

            const data = await response.json();

            if (data.success) {
              alert('Playlists linked successfully!');
              onLinkClick();
            } else {
              alert('Failed to link playlists');
            }
          } catch (error) {
            console.error('Error linking playlists:', error);
            alert('Failed to link playlists');
          }
        }}
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-green-500 to-red-500 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2"
      >
        <div className="text-sm">
          <span className="font-medium">{spotifyPlaylist.name}</span>
          <span className="mx-2">⟷</span>
          <span className="font-medium">{neteasePlaylist.name}</span>
        </div>
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" 
          />
        </svg>
      </button>
    </div>
  );
}
