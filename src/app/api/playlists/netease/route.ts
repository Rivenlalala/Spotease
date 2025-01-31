import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserPlaylists } from "@/lib/netease";
import { imageUrlToBase64 } from "@/lib/image";
import { Platform } from "@prisma/client";
import type { NeteasePlaylist } from "@/types/netease";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const refresh = searchParams.get("refresh") === "true";

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
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

    // First try to get cached playlists
    const cachedPlaylists = await prisma.playlist.findMany({
      where: {
        userId,
        platform: Platform.NETEASE,
        neteaseId: { not: null },
      },
      select: {
        neteaseId: true,
        name: true,
        cover: true,
        trackCount: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    // Return cached data if available and refresh not requested
    if (!refresh && cachedPlaylists.length > 0) {
      return Response.json({
        playlists: cachedPlaylists.map((playlist) => ({
          id: playlist.neteaseId!,
          name: playlist.name,
          platform: Platform.NETEASE,
          trackCount: playlist.trackCount,
          cover: playlist.cover,
        })),
        cached: true,
      });
    }

    // Fetch fresh playlists
    const { playlist } = await getUserPlaylists(user.neteaseCookie, user.neteaseId);
    const userPlaylists = playlist.filter(
      (p: NeteasePlaylist) => p.userId.toString() === user.neteaseId,
    );

    // Update playlist cache one by one to avoid overwhelming the server
    for (const playlist of userPlaylists) {
      try {
        let coverImage = null;
        if (playlist.coverImgUrl) {
          try {
            coverImage = await imageUrlToBase64(playlist.coverImgUrl);
          } catch (error) {
            console.error("Failed to convert cover image:", error);
          }
        }

        await prisma.playlist.upsert({
          where: {
            neteaseId: playlist.id.toString(),
          },
          create: {
            name: playlist.name,
            neteaseId: playlist.id.toString(),
            platform: Platform.NETEASE,
            userId,
            cover: coverImage,
            trackCount: playlist.trackCount,
          },
          update: {
            name: playlist.name,
            cover: coverImage,
            trackCount: playlist.trackCount,
          },
        });
      } catch (error) {
        console.error(`Failed to update playlist ${playlist.id}:`, error);
        // Continue with other playlists even if one fails
      }
    }

    // Get final state from database
    const updatedPlaylists = await prisma.playlist.findMany({
      where: {
        userId,
        platform: Platform.NETEASE,
        neteaseId: { in: userPlaylists.map((p) => p.id.toString()) },
      },
      select: {
        neteaseId: true,
        name: true,
        cover: true,
        trackCount: true,
      },
    });

    return Response.json({
      playlists: updatedPlaylists.map((playlist) => ({
        id: playlist.neteaseId!,
        name: playlist.name,
        platform: Platform.NETEASE,
        trackCount: playlist.trackCount,
        cover: playlist.cover,
      })),
    });
  } catch (error) {
    console.error("Error fetching Netease playlists:", error);
    return Response.json({ error: "Failed to fetch Netease playlists" }, { status: 500 });
  }
}
