'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to Spotease
        </h1>
        <p className="text-center text-xl mb-12">
          Sync your Spotify playlists with Netease Music
        </p>
        
        <div className="flex flex-col gap-4 max-w-xs mx-auto">
          <a
            href="/api/auth/spotify"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full text-center"
          >
            Login with Spotify
          </a>
          
          <button
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full"
            onClick={() => {/* TODO: Implement Netease login */}}
          >
            Login with Netease
          </button>
        </div>

        <div className="mt-8 text-center text-gray-600">
          <p>Connect both accounts to start syncing your playlists</p>
        </div>
      </div>
    </div>
  )
}
