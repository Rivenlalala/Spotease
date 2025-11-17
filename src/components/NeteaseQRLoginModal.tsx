"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, QrCode, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [statusType, setStatusType] = useState<"info" | "success" | "warning">("info");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(
    async (key: string) => {
      try {
        const response = await checkQRStatus(key);

        switch (response.code) {
        case 800:
          setStatus("QR code expired. Please refresh.");
          setStatusType("warning");
          setQRKey(null);
          break;
        case 801:
          setStatus("Waiting for scan...");
          setStatusType("info");
          break;
        case 802:
          setStatus("Scan successful. Waiting for confirmation...");
          setStatusType("info");
          break;
        case 803:
          setStatus("Login successful! Getting user info...");
          setStatusType("success");
          if (!response.cookie) {
            throw new Error("Missing cookie from login response");
          }
          try {
            const musicUCookie = extractMusicUCookie(response.cookie);

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

            const statusResponse = await getLoginStatus(musicUCookie);
            if (!statusResponse.data?.profile) {
              throw new Error("Invalid login status response");
            }

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
          setStatusType("warning");
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
      setStatusType("info");

      const key = await generateQRKey();
      setQRKey(key);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            Login to Netease Music
          </DialogTitle>
          <DialogDescription>
            Scan the QR code with your Netease Music app to connect your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-red-500" />
              <p className="mt-4 text-sm text-muted-foreground">Generating QR code...</p>
            </div>
          ) : qrImage ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-lg border bg-white p-4">
                <img src={qrImage} alt="QR Code" className="h-48 w-48" />
              </div>

              <div className="flex flex-col items-center gap-2">
                <Badge
                  variant={
                    statusType === "success"
                      ? "default"
                      : statusType === "warning"
                        ? "destructive"
                        : "secondary"
                  }
                  className="gap-1"
                >
                  {statusType === "success" && <CheckCircle2 className="h-3 w-3" />}
                  {statusType === "warning" && <AlertCircle className="h-3 w-3" />}
                  {statusType === "info" && <QrCode className="h-3 w-3" />}
                  {status}
                </Badge>

                <p className="text-center text-sm text-muted-foreground">
                  Open Netease Music App &rarr; Scan QR Code
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <QrCode className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">QR code expired or not available</p>
              <Button variant="outline" size="sm" onClick={initQRCode} className="mt-4 gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh QR Code
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
