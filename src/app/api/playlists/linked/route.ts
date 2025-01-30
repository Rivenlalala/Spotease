import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { Platform } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find all playlists that have a paired playlist
    const linkedPlaylists = await prisma.playlist.findMany({
      where: {
        userId,
        platform: Platform.SPOTIFY,
        pairedId: { not: null },
      },
      select: {
        spotifyId: true,
        name: true,
        trackCount: true,
        lastSynced: true,
        pairedWith: {
          select: {
            neteaseId: true,
            name: true,
            trackCount: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return Response.json({
      linkedPlaylists: linkedPlaylists.map(playlist => ({
        spotify: {
          id: playlist.spotifyId!,
          name: playlist.name,
          trackCount: playlist.trackCount,
        },
        netease: {
          id: playlist.pairedWith!.neteaseId!,
          name: playlist.pairedWith!.name,
          trackCount: playlist.pairedWith!.trackCount,
        },
        lastSynced: playlist.lastSynced?.toISOString(),
      }))
    });
  } catch (error) {
    console.error('Error fetching linked playlists:', error);
    return Response.json(
      { error: 'Failed to fetch linked playlists' },
      { status: 500 }
    );
  }
}
