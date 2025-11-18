import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiCache, cacheKeys } from "@/lib/cache";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, spotifyPlaylistId, neteasePlaylistId } = body as {
      userId: string;
      spotifyPlaylistId: string;
      neteasePlaylistId: string;
    };

    if (!userId || !spotifyPlaylistId || !neteasePlaylistId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create the playlist pairing
    const pairing = await prisma.playlistPairing.create({
      data: {
        userId,
        spotifyPlaylistId,
        neteasePlaylistId,
      },
    });

    // Invalidate cache for linked playlists
    apiCache.invalidate(cacheKeys.linkedPlaylists(userId));

    return Response.json({
      success: true,
      pairing: {
        id: pairing.id,
        spotifyPlaylistId: pairing.spotifyPlaylistId,
        neteasePlaylistId: pairing.neteasePlaylistId,
        createdAt: pairing.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error linking playlists:", error);

    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return Response.json(
        { error: "One of these playlists is already linked" },
        { status: 409 },
      );
    }

    return Response.json(
      { error: "Failed to link playlists" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairingId = searchParams.get("pairingId");
    const userId = searchParams.get("userId");

    if (!pairingId || !userId) {
      return Response.json(
        { error: "Missing pairingId or userId" },
        { status: 400 },
      );
    }

    // Delete the pairing (ensures user owns it)
    const deleted = await prisma.playlistPairing.deleteMany({
      where: {
        id: pairingId,
        userId: userId,
      },
    });

    if (deleted.count === 0) {
      return Response.json({ error: "Pairing not found" }, { status: 404 });
    }

    // Invalidate cache
    apiCache.invalidate(cacheKeys.linkedPlaylists(userId));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error unlinking playlists:", error);
    return Response.json(
      { error: "Failed to unlink playlists" },
      { status: 500 },
    );
  }
}
