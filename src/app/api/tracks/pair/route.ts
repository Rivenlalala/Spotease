import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiCache, cacheKeys } from "@/lib/cache";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { spotifyTrackId, neteaseTrackId } = await request.json();

    if (!spotifyTrackId || !neteaseTrackId) {
      return Response.json(
        { error: "Both spotifyTrackId and neteaseTrackId are required" },
        { status: 400 },
      );
    }

    // Create the track pairing - just store the ID mapping
    const pairing = await prisma.trackPairing.create({
      data: {
        spotifyTrackId,
        neteaseTrackId,
      },
    });

    // Invalidate track pairings cache so next fetch gets fresh data
    apiCache.invalidate(cacheKeys.trackPairings());

    return Response.json({
      success: true,
      pairing: {
        id: pairing.id,
        spotifyTrackId: pairing.spotifyTrackId,
        neteaseTrackId: pairing.neteaseTrackId,
      },
    });
  } catch (error) {
    // Handle unique constraint violations (track already paired)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return Response.json(
        { error: "One or both tracks are already paired" },
        { status: 400 },
      );
    }

    console.error("Error pairing tracks:", error);
    return Response.json({ error: "Failed to pair tracks" }, { status: 500 });
  }
}

// Get all track pairings
export async function GET(): Promise<Response> {
  try {
    // Check cache first
    const cached = apiCache.get<Array<{ spotifyTrackId: string; neteaseTrackId: string }>>(
      cacheKeys.trackPairings(),
    );

    if (cached) {
      return Response.json({ pairings: cached, cached: true });
    }

    const pairings = await prisma.trackPairing.findMany({
      select: {
        spotifyTrackId: true,
        neteaseTrackId: true,
      },
    });

    // Cache for 60 seconds (longer since pairings change less frequently)
    apiCache.set(cacheKeys.trackPairings(), pairings, 60);

    return Response.json({ pairings });
  } catch (error) {
    console.error("Error fetching track pairings:", error);
    return Response.json({ error: "Failed to fetch track pairings" }, { status: 500 });
  }
}

// Delete a track pairing
export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const { spotifyTrackId, neteaseTrackId } = await request.json();

    if (!spotifyTrackId && !neteaseTrackId) {
      return Response.json(
        { error: "Either spotifyTrackId or neteaseTrackId is required" },
        { status: 400 },
      );
    }

    // Delete by either ID
    if (spotifyTrackId) {
      await prisma.trackPairing.delete({
        where: { spotifyTrackId },
      });
    } else {
      await prisma.trackPairing.delete({
        where: { neteaseTrackId },
      });
    }

    // Invalidate cache
    apiCache.invalidate(cacheKeys.trackPairings());

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting track pairing:", error);
    return Response.json({ error: "Failed to delete track pairing" }, { status: 500 });
  }
}
