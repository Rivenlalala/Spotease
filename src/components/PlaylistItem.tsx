'use client'

import { useState } from 'react'
import { Platform } from '@prisma/client'
import Image from 'next/image'

interface Track {
  id: string
  name: string
  artist: string
  album: string
}

interface Playlist {
  id: string
  name: string
  platform: Platform
  trackCount: number
  cover: string | null
}

interface PlaylistItemProps {
  playlist: Playlist
  onSelect?: (playlist: Playlist | null) => void
  isSelected?: boolean
}

export default function PlaylistItem({ playlist, onSelect, isSelected }: PlaylistItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoadingTracks, setIsLoadingTracks] = useState(false)
  const [isRefreshingTracks, setIsRefreshingTracks] = useState(false)

  const handleToggleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent playlist selection when clicking triangle
    
    if (!isExpanded && tracks.length === 0) {
      await loadTracks()
    }
    setIsExpanded(!isExpanded)
  }

  const handleRefreshTracks = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent playlist selection when clicking refresh
    await loadTracks(true)
  }

  const handleClick = () => {
    onSelect?.(isSelected ? null : playlist)
  }

  const loadTracks = async (refresh = false) => {
    try {
      setIsLoadingTracks(true)
      if (refresh) {
        setIsRefreshingTracks(true)
      }

      const response = await fetch(
        `/api/playlists/${playlist.platform.toLowerCase()}/${playlist.id}/tracks${refresh ? '?refresh=true' : ''}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to load tracks')
      }

      const data = await response.json()
      setTracks(data.tracks)
    } catch (error) {
      console.error('Error loading tracks:', error)
    } finally {
      setIsLoadingTracks(false)
      setIsRefreshingTracks(false)
    }
  }

  return (
    <div 
      className={`
        bg-white rounded-lg shadow-sm overflow-hidden
        transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      <div
        className={`
          flex items-center space-x-4 p-3 cursor-pointer
          ${isSelected ? 'bg-blue-50' : 'hover:shadow-md'}
          transition-shadow duration-200
        `}
        onClick={handleClick}
      >
        <button
          className="flex-none p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
          onClick={handleToggleExpand}
          aria-label={isExpanded ? 'Collapse playlist' : 'Expand playlist'}
        >
          <svg
            className={`w-4 h-4 transform transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        <div className="flex-none w-16 h-16 relative rounded-md overflow-hidden">
          {playlist.cover ? (
            <img
              src={playlist.cover}
              alt={playlist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <Image
                src="/window.svg"
                alt="Playlist"
                width={24}
                height={24}
                className="opacity-50"
              />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {playlist.name}
          </p>
          <p className="text-sm text-gray-500">
            {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}
          </p>
        </div>

        {isExpanded && (
          <button
            className={`
              flex-none p-1.5 rounded-full
              ${isRefreshingTracks 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
              transition-colors duration-200
            `}
            onClick={handleRefreshTracks}
            disabled={isRefreshingTracks}
            aria-label="Refresh tracks"
          >
            <svg
              className={`w-4 h-4 ${isRefreshingTracks ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}

        {isSelected && (
          <div className="flex-none">
            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
              <svg 
                className="w-3 h-3 text-white" 
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
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100">
          {isLoadingTracks ? (
            <div className="p-4 text-center text-gray-500">
              Loading tracks...
            </div>
          ) : tracks.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No tracks found
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center px-4 py-2 hover:bg-gray-50"
                >
                  <span className="flex-none w-8 text-sm text-gray-400">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {track.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {track.artist} • {track.album}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
