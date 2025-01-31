import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, spotifyId, neteaseId } = body;

    // Get playlist details first
    const [spotifyPlaylist, neteasePlaylist] = await Promise.all([
      prisma.playlist.findUnique({ where: { spotifyId } }),
      prisma.playlist.findUnique({ where: { neteaseId } }),
    ]);

    if (!userId || !spotifyId || !neteaseId || !spotifyPlaylist || !neteasePlaylist) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Create playlist pair by updating both playlists
    const spotifyDbPlaylist = await prisma.playlist.update({
      where: { id: spotifyPlaylist.id },
      data: {
        pairedId: neteasePlaylist.id,
        lastSynced: new Date(),
      },
    });

    // Update netease playlist and get the updated pair
    await prisma.playlist.update({
      where: { id: neteasePlaylist.id },
      data: {
        pairedId: spotifyPlaylist.id,
        lastSynced: new Date(),
      },
    });

    const playlistPair = await prisma.playlist.findUnique({
      where: { id: spotifyDbPlaylist.id },
      include: {
        pairedWith: true,
      },
    });

    if (!playlistPair || !playlistPair.pairedWith) {
      throw new Error("Failed to create playlist pair");
    }

    return Response.json({
      success: true,
      pair: {
        spotify: {
          id: playlistPair.spotifyId,
          name: playlistPair.name,
        },
        netease: {
          id: playlistPair.pairedWith.neteaseId,
          name: playlistPair.pairedWith.name,
        },
        lastSynced: playlistPair.lastSynced,
      },
    });
  } catch (error) {
    console.error("Error linking playlists:", error);
    return Response.json({ error: "Failed to link playlists" }, { status: 500 });
  }
}
