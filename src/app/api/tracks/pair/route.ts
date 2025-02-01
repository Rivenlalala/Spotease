import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { spotifyTrackId, neteaseTrackId, sourceTrackId, targetTrackId, platform } = await request.json();

    // Support both direct pairing and platform-based pairing
    let finalSpotifyId: string;
    let finalNeteaseId: string;

    if (spotifyTrackId && neteaseTrackId) {
      finalSpotifyId = spotifyTrackId;
      finalNeteaseId = neteaseTrackId;
    } else if (sourceTrackId && targetTrackId && platform) {
      // Determine which ID is for which platform
      if (platform === "SPOTIFY") {
        finalSpotifyId = targetTrackId;
        finalNeteaseId = sourceTrackId;
      } else {
        finalSpotifyId = sourceTrackId;
        finalNeteaseId = targetTrackId;
      }
    } else {
      return Response.json(
        { error: "Invalid request. Must provide either spotifyTrackId and neteaseTrackId, or sourceTrackId, targetTrackId, and platform" },
        { status: 400 },
      );
    }

    // Find both tracks
    const [spotifyTrack, neteaseTrack] = await Promise.all([
      prisma.track.findUnique({
        where: { spotifyId: finalSpotifyId },
        include: {
          playlists: {
            select: {
              playlistId: true,
            },
          },
        },
      }),
      prisma.track.findUnique({
        where: { neteaseId: finalNeteaseId },
        include: {
          playlists: {
            select: {
              playlistId: true,
            },
          },
        },
      }),
    ]);

    if (!spotifyTrack || !neteaseTrack) {
      return Response.json({ error: "One or both tracks not found" }, { status: 404 });
    }

    // Find any existing pairs
    if (spotifyTrack.pairedId || neteaseTrack.pairedId) {
      return Response.json({ error: "One or both tracks are already paired" }, { status: 400 });
    }

    // Update both tracks to pair them
    await prisma.$transaction([
      prisma.track.update({
        where: { id: spotifyTrack.id },
        data: { pairedId: neteaseTrack.id },
      }),
      prisma.track.update({
        where: { id: neteaseTrack.id },
        data: { pairedId: spotifyTrack.id },
      }),
    ]);

    return Response.json({
      success: true,
      pairedTracks: {
        spotify: {
          id: spotifyTrack.spotifyId,
          name: spotifyTrack.name,
          artist: spotifyTrack.artist,
          album: spotifyTrack.album,
        },
        netease: {
          id: neteaseTrack.neteaseId,
          name: neteaseTrack.name,
          artist: neteaseTrack.artist,
          album: neteaseTrack.album,
        },
      },
    });
  } catch (error) {
    console.error("Error pairing tracks:", error);
    return Response.json({ error: "Failed to pair tracks" }, { status: 500 });
  }
}
