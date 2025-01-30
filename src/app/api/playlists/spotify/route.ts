import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { Platform } from '@prisma/client';
import { imageUrlToBase64 } from '@/lib/image';
import { refreshSpotifyToken } from '@/lib/spotify';
import type { SpotifyPlaylist, SpotifyError } from '@/types/spotify';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const refresh = searchParams.get('refresh') === 'true';

    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        spotifyId: true,
        spotifyRefreshToken: true
      }
    });

    if (!user?.spotifyId || !user?.spotifyRefreshToken) {
      return Response.json(
        { error: 'User not connected to Spotify' },
        { status: 400 }
      );
    }

    // First try to get cached playlists
    const cachedPlaylists = await prisma.playlist.findMany({
      where: {
        userId,
        platform: Platform.SPOTIFY,
        spotifyId: { not: null }
      },
      select: {
        spotifyId: true,
        name: true,
        cover: true,
        trackCount: true,
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Return cached data if available and refresh not requested
    if (!refresh && cachedPlaylists.length > 0) {
      console.log('Returning cached playlists:', 
        cachedPlaylists.map(p => ({
          id: p.spotifyId,
          name: p.name,
          hasCover: !!p.cover,
          coverLength: p.cover?.length
        }))
      );
      return Response.json({
        playlists: cachedPlaylists.map(playlist => ({
          id: playlist.spotifyId!,
          name: playlist.name,
          platform: Platform.SPOTIFY,
          trackCount: playlist.trackCount,
          cover: playlist.cover
        })),
        cached: true
      });
    }

    try {
      // Refresh token first
      const { access_token: accessToken } = await refreshSpotifyToken(user.spotifyRefreshToken);
      
      // Fetch both playlists and liked songs
      const [playlistsResponse, likedSongsResponse] = await Promise.all([
        fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch('https://api.spotify.com/v1/me/tracks', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      ]);

      if (!playlistsResponse.ok || !likedSongsResponse.ok) {
        const error = !playlistsResponse.ok 
          ? await playlistsResponse.json() 
          : await likedSongsResponse.json() as SpotifyError;
        throw new Error(`Spotify API error: ${error.error?.message || 'Unknown error'}`);
      }

      const [playlistsData, likedSongsData] = await Promise.all([
        playlistsResponse.json() as Promise<{ items: SpotifyPlaylist[] }>,
        likedSongsResponse.json()
      ]);

      // Regular playlists
      const userPlaylists = playlistsData.items.filter(
        (p: SpotifyPlaylist) => p.owner.id === user.spotifyId
      );

      console.log('Fetched playlists:', 
        userPlaylists.map(p => ({
          id: p.id,
          name: p.name,
          hasCoverUrl: p.images.length > 0,
          coverUrl: p.images[0]?.url
        }))
      );

      // Update playlist cache one by one to avoid overwhelming the server
      for (const playlist of userPlaylists) {
        try {
          console.log(`Processing playlist ${playlist.id} - ${playlist.name}`);
          console.log('Cover URL:', playlist.images[0]?.url);
          
          let coverImage = null;
          if (playlist.images[0]?.url) {
            try {
              coverImage = await imageUrlToBase64(playlist.images[0].url);
              console.log('Successfully converted cover to base64, length:', coverImage.length);
            } catch (error) {
              console.error('Failed to convert cover image:', error);
            }
          }

          await prisma.playlist.upsert({
            where: {
              spotifyId: playlist.id
            },
            create: {
              name: playlist.name,
              spotifyId: playlist.id,
              platform: Platform.SPOTIFY,
              userId,
              cover: coverImage,
              trackCount: playlist.tracks.total,
            },
            update: {
              name: playlist.name,
              cover: coverImage,
              trackCount: playlist.tracks.total,
            },
          });
        } catch (error) {
          console.error(`Failed to update playlist ${playlist.id}:`, error);
          // Continue with other playlists even if one fails
        }
      }

      // Read heart SVG for liked songs
      const heartSvg = await fs.readFile(path.join(process.cwd(), 'public', 'heart.svg'), 'utf-8');

      // Cache liked songs playlist
      await prisma.playlist.upsert({
        where: {
          spotifyId: 'liked-songs',
        },
        create: {
          spotifyId: 'liked-songs',
          name: 'Liked Songs',
          platform: Platform.SPOTIFY,
          userId,
          cover: heartSvg,
          trackCount: likedSongsData.total,
        },
        update: {
          trackCount: likedSongsData.total,
          cover: heartSvg,
          updatedAt: new Date(),
        },
      });

      // Get final state from database
      const updatedPlaylists = await prisma.playlist.findMany({
        where: {
          userId,
          platform: Platform.SPOTIFY,
          spotifyId: {
            in: [...userPlaylists.map(p => p.id), 'liked-songs']
          }
        },
        select: {
          spotifyId: true,
          name: true,
          cover: true,
          trackCount: true,
        }
      });

      console.log('Final playlists:', 
        updatedPlaylists.map(p => ({
          id: p.spotifyId,
          name: p.name,
          hasCover: !!p.cover,
          coverLength: p.cover?.length
        }))
      );

      return Response.json({
        playlists: updatedPlaylists.map(playlist => ({
          id: playlist.spotifyId!,
          name: playlist.name,
          platform: Platform.SPOTIFY,
          trackCount: playlist.trackCount,
          cover: playlist.cover,
        }))
      });
    } catch (error) {
      console.error('Spotify API error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error fetching Spotify playlists:', error);
    return Response.json(
      { error: 'Failed to fetch Spotify playlists' },
      { status: 500 }
    );
  }
}
