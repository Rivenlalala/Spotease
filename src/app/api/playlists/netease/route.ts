import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserPlaylists } from "@/lib/netease";
import { apiCache, cacheKeys } from "@/lib/cache";
import type { NeteasePlaylist } from "@/types/netease";
import { neteasePlaylistToGeneric } from "@/types/playlist";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check cache first
    const cacheKey = cacheKeys.neteasePlaylists(userId);
    const cached = apiCache.get<NeteasePlaylist[]>(cacheKey);

    if (cached) {
      return Response.json({
        playlists: cached.map(neteasePlaylistToGeneric),
        cached: true,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        neteaseId: true,
        neteaseCookie: true,
      },
    });

    if (!user?.neteaseId || !user?.neteaseCookie) {
      return Response.json({ error: "User not connected to Netease" }, { status: 400 });
    }

    // Fetch fresh playlists from NetEase API
    const { playlist } = await getUserPlaylists(user.neteaseCookie, user.neteaseId);

    // Filter to only user's own playlists
    const userPlaylists = playlist.filter((p) => p.userId.toString() === user.neteaseId);

    // Cache the API response
    apiCache.set(cacheKey, userPlaylists);

    return Response.json({
      playlists: userPlaylists.map(neteasePlaylistToGeneric),
    });
  } catch (error) {
    console.error("Error fetching Netease playlists:", error);
    return Response.json({ error: "Failed to fetch Netease playlists" }, { status: 500 });
  }
}
