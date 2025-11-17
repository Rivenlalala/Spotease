"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Music2, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import NeteaseQRLoginModal from "@/components/NeteaseQRLoginModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("userId");
  const error = searchParams.get("error");
  const [showNeteaseModal, setShowNeteaseModal] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();

        if (data.user) {
          // User is already logged in, redirect to dashboard
          router.push(`/dashboard?userId=${data.user.id}`);
          return;
        }
      } catch (error) {
        console.error("Failed to check session:", error);
      } finally {
        setCheckingSession(false);
      }
    }

    checkSession();
  }, [router]);

  const errorMessages: Record<string, string> = {
    spotify_auth_denied: "Spotify authentication was denied.",
    spotify_auth_failed: "Failed to authenticate with Spotify.",
    no_code: "No authorization code received from Spotify.",
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-lg text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500 to-red-500 flex items-center justify-center">
              <Music2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Welcome to Spotease</h1>
          <p className="text-xl text-muted-foreground">
            Seamlessly sync your Spotify playlists with Netease Music
          </p>
        </div>

        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle>Connect Your Accounts</CardTitle>
            <CardDescription>
              Link both services to start syncing your music across platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Spotify</p>
                  <p className="text-sm text-muted-foreground">
                    {userId ? "Connected" : "Not connected"}
                  </p>
                </div>
                {userId ? (
                  <Badge variant="default" className="gap-1 bg-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Button asChild className="gap-2 bg-green-600 hover:bg-green-700">
                    <a href="/api/auth/spotify">
                      Connect
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Netease Music</p>
                  <p className="text-sm text-muted-foreground">
                    {userId ? "Ready to connect" : "Connect Spotify first"}
                  </p>
                </div>
                <Button
                  onClick={() => setShowNeteaseModal(true)}
                  disabled={!userId}
                  className="gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  Connect
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {userId
                  ? "Great! Now connect your Netease account to start syncing"
                  : "Start by connecting your Spotify account"}
              </p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">
                {errorMessages[error] || "An error occurred during authentication."}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>Your data is secure and we only access what&apos;s necessary for syncing.</p>
        </div>
      </div>

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

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
          <div className="w-full max-w-2xl space-y-8">
            <div className="text-center space-y-4">
              <Skeleton className="h-16 w-16 rounded-2xl mx-auto" />
              <Skeleton className="h-10 w-3/4 mx-auto" />
              <Skeleton className="h-6 w-1/2 mx-auto" />
            </div>
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
