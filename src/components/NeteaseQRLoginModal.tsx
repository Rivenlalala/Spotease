"use client";

import { useState, useEffect, useCallback } from "react";
import {
  generateQRKey,
  generateQRCode,
  checkQRStatus,
  extractMusicUCookie,
  getLoginStatus,
} from "@/lib/netease";

interface NeteaseQRLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export default function NeteaseQRLoginModal({
  isOpen,
  onClose,
  userId,
  onSuccess,
}: NeteaseQRLoginModalProps) {
  const [qrImage, setQRImage] = useState<string | null>(null);
  const [qrKey, setQRKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(
    async (key: string) => {
      try {
        const response = await checkQRStatus(key);

        switch (response.code) {
        case 800:
          setStatus("QR code expired. Please refresh.");
          setQRKey(null);
          break;
        case 801:
          setStatus("Waiting for scan...");
          break;
        case 802:
          setStatus("Scan successful. Waiting for confirmation...");
          break;
        case 803:
          // Login successful, save cookie first
          setStatus("Login successful! Getting user info...");
          if (!response.cookie) {
            throw new Error("Missing cookie from login response");
          }
          try {
            const musicUCookie = extractMusicUCookie(response.cookie);

            // First, save the cookie
            const updateResponse = await fetch("/api/auth/netease", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId,
                cookie: musicUCookie,
              }),
            });

            if (!updateResponse.ok) {
              throw new Error("Failed to save cookie");
            }

            // Then, get login status using the saved cookie
            const statusResponse = await getLoginStatus(musicUCookie);
            if (!statusResponse.data?.profile) {
              throw new Error("Invalid login status response");
            }

            // Finally, update user profile with status info
            const updateProfileResponse = await fetch("/api/auth/netease/profile", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId,
                profile: {
                  userId: statusResponse.data.profile.userId,
                  nickname: statusResponse.data.profile.nickname,
                  avatarUrl: statusResponse.data.profile.avatarUrl,
                },
              }),
            });

            if (!updateProfileResponse.ok) {
              throw new Error("Failed to update profile");
            }

            onSuccess();
            onClose();
          } catch (error) {
            setError("Failed to save login data");
            console.error("Update error:", error);
          }
          break;
        default:
          setStatus("Unknown status. Please try again.");
          break;
        }

        return response.code;
      } catch (error) {
        setError("Failed to check QR code status");
        console.error("Status check error:", error);
        return null;
      }
    },
    [userId, onSuccess, onClose],
  );

  const initQRCode = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setStatus("Generating QR code...");

      // Generate QR key
      const key = await generateQRKey();
      setQRKey(key);

      // Generate QR code
      const qrImg = await generateQRCode(key);
      setQRImage(qrImg);
      setStatus("Waiting for scan...");
    } catch (error) {
      setError("Failed to generate QR code");
      console.error("QR generation error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      initQRCode();
    } else {
      setQRImage(null);
      setQRKey(null);
      setStatus("");
      setError("");
    }
  }, [isOpen, initQRCode]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (qrKey && isOpen) {
      intervalId = setInterval(async () => {
        const code = await checkStatus(qrKey);
        if (code === 800 || code === 803) {
          clearInterval(intervalId);
        }
      }, 3000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [qrKey, isOpen, checkStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-4">Login to Netease</h2>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : qrImage ? (
            <div className="flex flex-col items-center space-y-4">
              <img src={qrImage} alt="QR Code" className="w-48 h-48" />
              <p className="text-sm text-gray-600">Scan with Netease Music App</p>
              <p className="text-sm font-medium text-gray-800">{status}</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={initQRCode}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Refresh QR Code
              </button>
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
