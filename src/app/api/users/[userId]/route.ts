import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const params = await context.params;
  const { userId } = params;
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        spotifyId: true,
        neteaseId: true,
        neteaseName: true,
        neteaseAvatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return Response.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
