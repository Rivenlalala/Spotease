"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import NeteaseQRLoginModal from "@/components/NeteaseQRLoginModal";

export default function Home() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const error = searchParams.get("error");
  const [showNeteaseModal, setShowNeteaseModal] = useState(false);

  const errorMessages: Record<string, string> = {
    spotify_auth_denied: "Spotify authentication was denied.",
    spotify_auth_failed: "Failed to authenticate with Spotify.",
    no_code: "No authorization code received from Spotify.",
  };
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">Welcome to Spotease</h1>
        <p className="text-center text-xl mb-12">Sync your Spotify playlists with Netease Music</p>

        <div className="flex flex-col gap-4 max-w-xs mx-auto">
          <a
            href="/api/auth/spotify"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full text-center"
          >
            Login with Spotify
          </a>

          {userId ? (
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full"
              onClick={() => setShowNeteaseModal(true)}
            >
              Login with Netease
            </button>
          ) : (
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full opacity-50 cursor-not-allowed"
              disabled
              title="Please login with Spotify first"
            >
              Login with Netease
            </button>
          )}
        </div>

        <div className="mt-8 text-center text-gray-600">
          <p>{userId ? "Connect your Netease account to start syncing" : "Connect both accounts to start syncing your playlists"}</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 text-center text-red-500">
            <p>{errorMessages[error] || "An error occurred during authentication."}</p>
          </div>
        )}
      </div>

      {/* Netease Login Modal */}
      {userId && (
        <NeteaseQRLoginModal
          isOpen={showNeteaseModal}
          onClose={() => setShowNeteaseModal(false)}
          userId={userId}
          onSuccess={() => {
            setShowNeteaseModal(false);
            window.location.href = `/dashboard?userId=${userId}`;
          }}
        />
      )}
    </div>
  );
}
