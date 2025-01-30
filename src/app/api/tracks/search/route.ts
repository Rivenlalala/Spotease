import { NextRequest } from 'next/server';
import { Platform } from '@prisma/client';
import { searchTracks as searchNeteaseTracks } from '@/lib/netease';
import { searchTracks as searchSpotifyTracks, refreshSpotifyToken } from '@/lib/spotify';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const platform = searchParams.get('platform') as Platform;
    const userId = searchParams.get('userId');

    if (!query || !platform || !userId) {
      return Response.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        neteaseCookie: true,
        spotifyAccessToken: true,
        spotifyRefreshToken: true,
      },
    });

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (platform === 'SPOTIFY') {
      if (!user.spotifyAccessToken) {
        return Response.json(
          { error: 'User not connected to Spotify' },
          { status: 400 }
        );
      }

      try {
        const results = await searchSpotifyTracks(query, user.spotifyAccessToken);
        return Response.json({
          tracks: results.tracks.items.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
          })),
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Failed to search tracks') {
          if (!user.spotifyRefreshToken) {
            return Response.json(
              { error: 'No refresh token available' },
              { status: 401 }
            );
          }

          try {
            const refreshedTokens = await refreshSpotifyToken(user.spotifyRefreshToken);
            
            // Update user's access token
            await prisma.user.update({
              where: { id: userId },
              data: { spotifyAccessToken: refreshedTokens.access_token }
            });

            // Retry search with new token
            const results = await searchSpotifyTracks(query, refreshedTokens.access_token);
            return Response.json({
              tracks: results.tracks.items.map(track => ({
                id: track.id,
                name: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
              })),
            });
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            return Response.json(
              { error: 'Failed to refresh Spotify token' },
              { status: 401 }
            );
          }
        }
        throw error;
      }
    } else if (platform === 'NETEASE') {
      if (!user.neteaseCookie) {
        return Response.json(
          { error: 'User not connected to Netease' },
          { status: 400 }
        );
      }

      const results = await searchNeteaseTracks(query, user.neteaseCookie);
      if (!results.result?.songs) {
        return Response.json({ tracks: [] });
      }

      return Response.json({
        tracks: results.result.songs.map(song => {
          let artistString = '';
          if (song.ar && song.ar.length > 0) {
            artistString = song.ar.map(a => a.name).join(', ');
          }

          return {
            id: song.id.toString(),
            name: song.name,
            artist: artistString,
            album: song.al?.name || 'Unknown Album',
          };
        }),
      });
    } else {
      return Response.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error searching tracks:', error);
    return Response.json(
      { error: 'Failed to search tracks' },
      { status: 500 }
    );
  }
}
