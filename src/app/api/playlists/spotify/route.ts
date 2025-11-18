import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { refreshSpotifyToken } from "@/lib/spotify";
import { apiCache, cacheKeys } from "@/lib/cache";
import type { SpotifyPlaylist } from "@/types/spotify";
import { spotifyPlaylistToGeneric } from "@/types/playlist";
import fs from "fs/promises";
import path from "path";

interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylist[];
  total: number;
  next: string | null;
}

async function fetchAllSpotifyPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
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

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check cache first
    const cacheKey = cacheKeys.spotifyPlaylists(userId);
    const cached = apiCache.get<SpotifyPlaylist[]>(cacheKey);

    if (cached) {
      // Add liked songs to cached result
      const likedSongsPlaylist = createLikedSongsPlaylist(cached);
      return Response.json({
        playlists: [...likedSongsPlaylist, ...cached.map(spotifyPlaylistToGeneric)],
        cached: true,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        spotifyId: true,
        spotifyRefreshToken: true,
      },
    });

    if (!user?.spotifyId || !user?.spotifyRefreshToken) {
      return Response.json({ error: "User not connected to Spotify" }, { status: 400 });
    }

    // Refresh token and fetch fresh playlists
    const { access_token: accessToken } = await refreshSpotifyToken(user.spotifyRefreshToken);

    // Fetch playlists and liked songs count in parallel
    const [allPlaylists, likedSongsResponse] = await Promise.all([
      fetchAllSpotifyPlaylists(accessToken),
      fetch("https://api.spotify.com/v1/me/tracks?limit=1", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    // Filter to only user's own playlists
    const userPlaylists = allPlaylists.filter((p) => p.owner.id === user.spotifyId);

    // Cache the API response
    apiCache.set(cacheKey, userPlaylists);

    // Get liked songs count
    let likedSongsCount = 0;
    if (likedSongsResponse.ok) {
      const likedSongsData = await likedSongsResponse.json();
      likedSongsCount = likedSongsData.total || 0;
    }

    // Create liked songs playlist
    const likedSongsPlaylist = await createLikedSongsPlaylistWithCount(likedSongsCount);

    return Response.json({
      playlists: [likedSongsPlaylist, ...userPlaylists.map(spotifyPlaylistToGeneric)],
    });
  } catch (error) {
    console.error("Error fetching Spotify playlists:", error);
    return Response.json({ error: "Failed to fetch Spotify playlists" }, { status: 500 });
  }
}

function createLikedSongsPlaylist(_playlists: SpotifyPlaylist[]) {
  // Return empty array - will be populated with proper count when fetched
  return [];
}

async function createLikedSongsPlaylistWithCount(count: number) {
  // Create data URL for heart SVG
  try {
    const heartSvg = await fs.readFile(path.join(process.cwd(), "public", "heart.svg"), "utf-8");
    const heartDataUrl = `data:image/svg+xml;base64,${Buffer.from(heartSvg).toString("base64")}`;

    return {
      id: "liked-songs",
      name: "Liked Songs",
      platform: "SPOTIFY" as const,
      trackCount: count,
      cover: heartDataUrl,
    };
  } catch {
    return {
      id: "liked-songs",
      name: "Liked Songs",
      platform: "SPOTIFY" as const,
      trackCount: count,
      cover: null,
    };
  }
}
