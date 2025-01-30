import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { refreshSpotifyToken } from '@/lib/spotify';
import { Platform } from '@prisma/client';
import type { SpotifyTrack } from '@/types/spotify';

async function fetchPlaylistTracks(playlistId: string, accessToken: string): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let url = playlistId === 'liked-songs'
    ? 'https://api.spotify.com/v1/me/tracks?limit=50'
    : `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tracks');
    }

    const data = await response.json();
    tracks.push(...data.items.map((item: any) => item.track).filter(Boolean));
    url = data.next;
  }

  return tracks;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { playlistId: string } }
): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const refresh = searchParams.get('refresh') === 'true';
    const { playlistId } = params;

    // First try to get cached tracks
    const playlist = await prisma.playlist.findUnique({
      where: { spotifyId: playlistId },
      select: {
        id: true,
        userId: true,
        trackCount: true,
        tracks: {
          include: {
            track: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    if (!playlist) {
      return Response.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Return cached tracks if available and refresh not requested
    if (!refresh && playlist.tracks.length > 0) {
      return Response.json({
        tracks: playlist.tracks.map(pt => ({
          id: pt.track.spotifyId!,
          name: pt.track.name,
          artist: pt.track.artist,
          album: pt.track.album,
          position: pt.position,
        })),
        trackCount: playlist.trackCount || playlist.tracks.length,
        cached: true,
      });
    }

    // Get user's refresh token
    const user = await prisma.user.findUnique({
      where: { id: playlist.userId },
      select: {
        spotifyRefreshToken: true,
      },
    });

    if (!user?.spotifyRefreshToken) {
      return Response.json(
        { error: 'User not connected to Spotify' },
        { status: 400 }
      );
    }

    // Refresh access token
    const { access_token: accessToken } = await refreshSpotifyToken(user.spotifyRefreshToken);

    // Fetch fresh tracks
    const spotifyTracks = await fetchPlaylistTracks(playlistId, accessToken);

    // Update tracks in database
    await prisma.$transaction(async (tx) => {
      // First, remove all existing tracks for this playlist
      await tx.playlistTrack.deleteMany({
        where: { playlistId: playlist.id },
      });

      // Update the playlist's trackCount
      await tx.playlist.update({
        where: { id: playlist.id },
        data: { trackCount: spotifyTracks.length },
      });

      // Then create or update tracks and their relationships
      for (const [index, track] of spotifyTracks.entries()) {
        const trackRecord = await tx.track.upsert({
          where: { spotifyId: track.id },
          create: {
            spotifyId: track.id,
            name: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
          },
          update: {
            name: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
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
    const updatedTracks = spotifyTracks.map((track, index) => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      position: index,
    }));

    return Response.json({
      tracks: updatedTracks,
      trackCount: spotifyTracks.length,
    });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return Response.json(
      { error: 'Failed to fetch tracks' },
      { status: 500 }
    );
  }
}
