import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getPlaylistTracks, addTracksToPlaylist } from "@/lib/netease";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ playlistId: string }> },
): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const refresh = searchParams.get("refresh") === "true";
    const { playlistId } = await context.params;

    // First try to get cached tracks
    const playlist = await prisma.playlist.findUnique({
      where: { neteaseId: playlistId },
      select: {
        id: true,
        userId: true,
        trackCount: true,
        tracks: {
          include: {
            track: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!playlist) {
      return Response.json({ error: "Playlist not found" }, { status: 404 });
    }

    // Return cached tracks if available and refresh not requested
    if (!refresh && playlist.tracks.length > 0) {
      return Response.json({
        tracks: playlist.tracks.map((pt) => ({
          id: pt.track.neteaseId!,
          name: pt.track.name,
          artist: pt.track.artist,
          album: pt.track.album,
          position: pt.position,
        })),
        trackCount: playlist.trackCount || playlist.tracks.length,
        cached: true,
      });
    }

    // Get user's cookie
    const user = await prisma.user.findUnique({
      where: { id: playlist.userId },
      select: {
        neteaseCookie: true,
      },
    });

    if (!user?.neteaseCookie) {
      return Response.json({ error: "User not connected to Netease" }, { status: 400 });
    }

    // Fetch fresh tracks
    const response = await getPlaylistTracks(playlistId, user.neteaseCookie);
    
    // Update tracks in database
    await prisma.$transaction(async (tx) => {
      // First, remove all existing tracks for this playlist
      await tx.playlistTrack.deleteMany({
        where: { playlistId: playlist.id },
      });

      // Update the playlist's trackCount
      await tx.playlist.update({
        where: { id: playlist.id },
        data: { trackCount: response.songs.length },
      });

      // Then create or update tracks and their relationships
      for (const [index, track] of response.songs.entries()) {
        const trackRecord = await tx.track.upsert({
          where: { neteaseId: track.id.toString() },
          create: {
            neteaseId: track.id.toString(),
            name: track.name,
            artist: track.ar.map((a) => a.name).join(", "),
            album: track.al.name,
          },
          update: {
            name: track.name,
            artist: track.ar.map((a) => a.name).join(", "),
            album: track.al.name,
          },
        });

        await tx.playlistTrack.create({
          data: {
            playlistId: playlist.id,
            trackId: trackRecord.id,
            position: index,
          },
        });
      }
    });

    // Return updated tracks
    const updatedTracks = response.songs.map((track, index) => ({
      id: track.id.toString(),
      name: track.name,
      artist: track.ar.map((a) => a.name).join(", "),
      album: track.al.name,
      position: index,
    }));

    return Response.json({
      tracks: updatedTracks,
      trackCount: response.songs.length,
    });
  } catch (error) {
    console.error("Error fetching tracks:", error);
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
      return Response.json({ error: "User not connected to Netease" }, { status: 400 });
    }

    // Add tracks to playlist
    await addTracksToPlaylist(playlistId, trackIds, user.neteaseCookie);

    // Update database
    const playlist = await prisma.playlist.findUnique({
      where: { neteaseId: playlistId },
      select: { 
        id: true,
        tracks: {
          select: { position: true },
        },
      },
    });

    if (!playlist) {
      return Response.json({ error: "Playlist not found" }, { status: 404 });
    }

    // Find the highest position number
    const maxPosition = playlist.tracks.length > 0 
      ? Math.max(...playlist.tracks.map(t => t.position)) 
      : -1;

    // Create or update tracks and their relationships
    await prisma.$transaction(async (tx) => {
      for (const [index, trackId] of trackIds.entries()) {
        const trackRecord = await tx.track.upsert({
          where: { neteaseId: trackId },
          create: {
            neteaseId: trackId,
            name: "", // These will be updated on next GET refresh
            artist: "",
            album: "",
          },
          update: {},
        });

        // Skip if track is already in playlist
        const existingTrack = await tx.playlistTrack.findUnique({
          where: {
            playlistId_trackId: {
              playlistId: playlist.id,
              trackId: trackRecord.id,
            },
          },
        });

        if (!existingTrack) {
          await tx.playlistTrack.create({
            data: {
              playlistId: playlist.id,
              trackId: trackRecord.id,
              position: maxPosition + 1 + index,
            },
          });
        }
      }

      // Get all tracks records for counting
      const trackRecords = await Promise.all(
        trackIds.map((id) => tx.track.findUnique({
          where: { neteaseId: id },
          select: { id: true },
        })),
      );

      // Filter out undefined tracks and get their IDs
      const trackRecordIds = trackRecords
        .filter((t): t is { id: string } => t !== null)
        .map(t => t.id);

      // Count existing tracks
      const existingCount = await tx.playlistTrack.count({
        where: {
          playlistId: playlist.id,
          trackId: {
            in: trackRecordIds,
          },
        },
      });

      // Update track count only for new tracks
      const newTracksCount = trackIds.length - existingCount;
      if (newTracksCount > 0) {
        await tx.playlist.update({
          where: { id: playlist.id },
          data: {
            trackCount: {
              increment: newTracksCount,
            },
          },
        });
      }
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error adding tracks:", error);
    return Response.json({ error: "Failed to add tracks" }, { status: 500 });
  }
}
