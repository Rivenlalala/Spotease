import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getPlaylistTracks, addTracksToPlaylist } from "@/lib/netease";

export const GET = async (
  request: NextRequest,
  { params }: { params: { playlistId: string } },
): Promise<Response> => {
  try {
    const { playlistId } = await params;

    // First try to get cached tracks
    const playlist = await prisma.playlist.findUnique({
      where: { neteaseId: playlistId },
      select: {
        id: true,
        trackCount: true,
        tracks: {
          include: {
            track: true,
          },
          orderBy: {
            position: "asc",
          },
        },
        user: {
          select: {
            neteaseCookie: true,
          },
        },
      },
    });

    if (!playlist) {
      return Response.json({ error: "Playlist not found" }, { status: 404 });
    }

    if (!playlist.user.neteaseCookie) {
      return Response.json({ error: "User not connected to Netease" }, { status: 400 });
    }

    // Return cached tracks if available and refresh not requested
    if (!request.url.includes("refresh=true")) {
      if (playlist.tracks.length > 0) {
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
    }

    // Fetch fresh tracks from Netease using the user's cookie
    const { songs: neteaseTracks } = await getPlaylistTracks(
      playlistId,
      playlist.user.neteaseCookie,
    );

    // Update tracks in database
    await prisma.$transaction(async (tx) => {
      // First, remove all existing tracks for this playlist
      await tx.playlistTrack.deleteMany({
        where: { playlistId: playlist.id },
      });

      // Update the playlist's trackCount
      await tx.playlist.update({
        where: { id: playlist.id },
        data: { trackCount: neteaseTracks.length },
      });

      // Then create or update tracks and their relationships
      for (const [index, track] of neteaseTracks.entries()) {
        const trackRecord = await tx.track.upsert({
          where: { neteaseId: track.id.toString() },
          create: {
            neteaseId: track.id.toString(),
            name: track.name,
            artist: (track.ar || []).map((a) => a.name).join(", "),
            album: track.al?.name || "Unknown Album",
          },
          update: {
            name: track.name,
            artist: (track.ar || []).map((a) => a.name).join(", "),
            album: track.al?.name || "Unknown Album",
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

    // Get updated tracks
    const updatedTracks = neteaseTracks.map((track, index) => ({
      id: track.id,
      name: track.name,
      artist: (track.ar || []).map((a) => a.name).join(", "),
      album: track.al?.name || "Unknown Album",
      position: index,
    }));

    return Response.json({
      tracks: updatedTracks,
      trackCount: neteaseTracks.length,
    });
  } catch (error) {
    console.error("Error fetching tracks:", error);
    return Response.json({ error: "Failed to fetch tracks" }, { status: 500 });
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: { playlistId: string } },
): Promise<Response> {
  try {
    const { playlistId } = params;
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
      select: { id: true },
    });

    if (!playlist) {
      return Response.json({ error: "Playlist not found" }, { status: 404 });
    }

    // Create or update tracks and their relationships
    await prisma.$transaction(async (tx) => {
      const currentPosition = await tx.playlistTrack.count({
        where: { playlistId: playlist.id },
      });

      for (const [index, trackId] of trackIds.entries()) {
        const trackRecord = await tx.track.upsert({
          where: { neteaseId: trackId.toString() },
          create: {
            neteaseId: trackId.toString(),
            name: "", // These will be updated on next GET refresh
            artist: "",
            album: "",
          },
          update: {},
        });

        await tx.playlistTrack.create({
          data: {
            playlistId: playlist.id,
            trackId: trackRecord.id,
            position: currentPosition + index,
          },
        });
      }

      // Update track count
      await tx.playlist.update({
        where: { id: playlist.id },
        data: {
          trackCount: {
            increment: trackIds.length,
          },
        },
      });
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error adding tracks:", error);
    return Response.json({ error: "Failed to add tracks" }, { status: 500 });
  }
}
