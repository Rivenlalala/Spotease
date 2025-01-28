'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import NeteaseQRLoginModal from '@/components/NeteaseQRLoginModal'

export default function Dashboard() {
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showNeteaseModal, setShowNeteaseModal] = useState(false)

  async function loadUser() {
    if (!userId) return
    try {
      const response = await fetch(`/api/users/${userId}`)
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [userId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl text-red-500">User not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center space-x-4">
            {user.image && (
              <img
                src={user.image}
                alt={user.name}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>

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
                      alt={user.neteaseName || 'Netease Avatar'}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  {user.neteaseName && (
                    <p className="text-sm text-gray-600">{user.neteaseName}</p>
                  )}
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
      </div>
      {userId && (
        <NeteaseQRLoginModal
          isOpen={showNeteaseModal}
          onClose={() => setShowNeteaseModal(false)}
          userId={userId}
          onSuccess={() => {
            setShowNeteaseModal(false)
            // Refresh user data
            loadUser()
          }}
        />
      )}
    </div>
  )
}
