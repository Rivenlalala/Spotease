import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getPlaylistTracks, addTracksToPlaylist } from "@/lib/netease";
import { apiCache, cacheKeys } from "@/lib/cache";
import type { NeteaseTrack } from "@/types/netease";
import { neteaseTrackToGeneric } from "@/types/track";

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
    const cacheKey = cacheKeys.neteaseTracks(playlistId);
    const cached = apiCache.get<NeteaseTrack[]>(cacheKey);

    if (cached) {
      return Response.json({
        tracks: cached.map((track, index) => ({
          ...neteaseTrackToGeneric(track),
          position: index,
        })),
        cached: true,
      });
    }

    // Get user's cookie
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        neteaseCookie: true,
      },
    });

    if (!user?.neteaseCookie) {
      return Response.json({ error: "User not connected to NetEase" }, { status: 400 });
    }

    // Fetch fresh tracks from NetEase API
    const response = await getPlaylistTracks(playlistId, user.neteaseCookie);

    // Cache the raw API response
    apiCache.set(cacheKey, response.songs);

    // Return normalized tracks
    return Response.json({
      tracks: response.songs.map((track, index) => ({
        ...neteaseTrackToGeneric(track),
        position: index,
      })),
    });
  } catch (error) {
    console.error("Error fetching NetEase tracks:", error);
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

    // Get user's cookie
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        neteaseCookie: true,
      },
    });

    if (!user?.neteaseCookie) {
      return Response.json({ error: "User not connected to NetEase" }, { status: 400 });
    }

    // Add tracks directly to NetEase - no database operations needed
    await addTracksToPlaylist(playlistId, trackIds, user.neteaseCookie);

    // Invalidate cache so next fetch gets fresh data
    apiCache.invalidate(cacheKeys.neteaseTracks(playlistId));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error adding tracks to NetEase:", error);
    return Response.json({ error: "Failed to add tracks" }, { status: 500 });
  }
}
