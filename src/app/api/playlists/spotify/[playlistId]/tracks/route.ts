import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { refreshSpotifyToken, addTracksToPlaylist } from "@/lib/spotify";
import { apiCache, cacheKeys } from "@/lib/cache";
import type { SpotifyTrack, SpotifyTrackItem } from "@/types/spotify";
import { spotifyTrackToGeneric } from "@/types/track";

async function fetchPlaylistTracks(
  playlistId: string,
  accessToken: string,
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let url =
    playlistId === "liked-songs"
      ? "https://api.spotify.com/v1/me/tracks?limit=50"
      : `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch tracks from Spotify");
    }

    const data = await response.json();
    const items = data.items
      .filter((item: SpotifyTrackItem) => item.track && item.track.id)
      .map((item: SpotifyTrackItem) => item.track);
    tracks.push(...items);
    url = data.next;
  }

  return tracks;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ playlistId: string }> },
): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const { playlistId } = await context.params;

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check cache first (30-second TTL)
    const cacheKey = cacheKeys.spotifyTracks(playlistId);
    const cached = apiCache.get<SpotifyTrack[]>(cacheKey);

    if (cached) {
      return Response.json({
        tracks: cached.map((track, index) => ({
          ...spotifyTrackToGeneric(track),
          position: index,
        })),
        cached: true,
      });
    }

    // Get user's refresh token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        spotifyRefreshToken: true,
      },
    });

    if (!user?.spotifyRefreshToken) {
      return Response.json({ error: "User not connected to Spotify" }, { status: 400 });
    }

    // Refresh access token and fetch fresh tracks
    const { access_token: accessToken } = await refreshSpotifyToken(user.spotifyRefreshToken);
    const spotifyTracks = await fetchPlaylistTracks(playlistId, accessToken);

    // Cache the raw API response
    apiCache.set(cacheKey, spotifyTracks);

    // Return normalized tracks
    return Response.json({
      tracks: spotifyTracks.map((track, index) => ({
        ...spotifyTrackToGeneric(track),
        position: index,
      })),
    });
  } catch (error) {
    console.error("Error fetching Spotify tracks:", error);
    return Response.json({ error: "Failed to fetch tracks" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ playlistId: string }> },
): Promise<Response> {
  try {
    const { playlistId } = await context.params;
    const { trackIds, userId } = await request.json();

    if (!Array.isArray(trackIds) || trackIds.length === 0 || !userId) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Get user's refresh token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        spotifyRefreshToken: true,
      },
    });

    if (!user?.spotifyRefreshToken) {
      return Response.json({ error: "User not connected to Spotify" }, { status: 400 });
    }

    // Refresh access token
    const { access_token: accessToken } = await refreshSpotifyToken(user.spotifyRefreshToken);

    // Add tracks directly to Spotify - no database operations needed
    await addTracksToPlaylist(playlistId, trackIds, accessToken);

    // Invalidate cache so next fetch gets fresh data
    apiCache.invalidate(cacheKeys.spotifyTracks(playlistId));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error adding tracks to Spotify:", error);
    return Response.json({ error: "Failed to add tracks" }, { status: 500 });
  }
}
