import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { refreshSpotifyToken } from "@/lib/spotify";
import { getUserPlaylists as getNeteaseUserPlaylists } from "@/lib/netease";
import { apiCache, cacheKeys } from "@/lib/cache";
import type { SpotifyPlaylist } from "@/types/spotify";
import type { NeteasePlaylist } from "@/types/netease";

interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylist[];
  total: number;
  next: string | null;
}

async function fetchSpotifyPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
  const playlists: SpotifyPlaylist[] = [];
  let url: string | null = "https://api.spotify.com/v1/me/playlists?limit=50";

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Spotify playlists");
    }

    const data: SpotifyPlaylistsResponse = await response.json();
    playlists.push(...data.items);
    url = data.next;
  }

  return playlists;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get user credentials and pairings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        spotifyRefreshToken: true,
        neteaseCookie: true,
        neteaseId: true,
        playlistPairings: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (user.playlistPairings.length === 0) {
      return Response.json({ linkedPlaylists: [] });
    }

    // Fetch fresh playlist data from both platforms in parallel
    const [spotifyPlaylists, neteasePlaylists] = await Promise.all([
      // Fetch Spotify playlists
      (async () => {
        if (!user.spotifyRefreshToken) return [];

        // Check cache first
        const cached = apiCache.get<SpotifyPlaylist[]>(cacheKeys.spotifyPlaylists(userId));
        if (cached) return cached;

        const { access_token: accessToken } = await refreshSpotifyToken(user.spotifyRefreshToken);
        const playlists = await fetchSpotifyPlaylists(accessToken);

        // Cache for 30 seconds
        apiCache.set(cacheKeys.spotifyPlaylists(userId), playlists);
        return playlists;
      })(),
      // Fetch NetEase playlists
      (async () => {
        if (!user.neteaseCookie || !user.neteaseId) return [];

        // Check cache first
        const cached = apiCache.get<NeteasePlaylist[]>(cacheKeys.neteasePlaylists(userId));
        if (cached) return cached;

        const response = await getNeteaseUserPlaylists(user.neteaseCookie, user.neteaseId);

        // Cache for 30 seconds
        apiCache.set(cacheKeys.neteasePlaylists(userId), response.playlist);
        return response.playlist;
      })(),
    ]);

    // Map playlists by their IDs for quick lookup
    const spotifyMap = new Map(spotifyPlaylists.map((p) => [p.id, p]));
    const neteaseMap = new Map(neteasePlaylists.map((p) => [String(p.id), p]));

    // Build linked playlists with fresh data
    const linkedPlaylists = user.playlistPairings
      .map((pairing) => {
        const spotify = spotifyMap.get(pairing.spotifyPlaylistId);
        const netease = neteaseMap.get(pairing.neteasePlaylistId);

        // Skip if playlist no longer exists on either platform
        if (!spotify || !netease) {
          return null;
        }

        return {
          pairingId: pairing.id,
          spotify,
          netease,
          createdAt: pairing.createdAt.toISOString(),
        };
      })
      .filter(Boolean);

    return Response.json({ linkedPlaylists });
  } catch (error) {
    console.error("Error fetching linked playlists:", error);
    return Response.json({ error: "Failed to fetch linked playlists" }, { status: 500 });
  }
}
