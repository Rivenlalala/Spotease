import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { PrismaClient } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const { spotifyTrackId, neteaseTrackId } = await request.json();

    if (!spotifyTrackId || !neteaseTrackId) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Find or create both tracks in a transaction
    const [spotifyTrack, neteaseTrack] = await prisma.$transaction(async (tx) => {
      const spotifyTrack = await tx.track.upsert({
        where: { spotifyId: spotifyTrackId },
        update: {},
        create: {
          spotifyId: spotifyTrackId,
          name: "", // These will be populated by the sync process
          artist: "",
          album: "",
        },
      });

      const neteaseTrack = await tx.track.upsert({
        where: { neteaseId: neteaseTrackId.toString() },
        update: {},
        create: {
          neteaseId: neteaseTrackId.toString(),
          name: "", // These will be populated by the sync process
          artist: "",
          album: "",
        },
      });

      // Link the tracks together
      await tx.track.update({
        where: { id: spotifyTrack.id },
        data: { pairedId: neteaseTrack.id },
      });

      await tx.track.update({
        where: { id: neteaseTrack.id },
        data: { pairedId: spotifyTrack.id },
      });

      return [spotifyTrack, neteaseTrack];
    });

    return Response.json({
      success: true,
      spotifyTrack,
      neteaseTrack,
    });
  } catch (error) {
    console.error("Error pairing tracks:", error);
    return Response.json({ error: "Failed to pair tracks" }, { status: 500 });
  }
}
