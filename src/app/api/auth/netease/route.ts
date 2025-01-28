import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, cookie } = await request.json();

    if (!userId || !cookie) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update user with Netease cookie
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        neteaseCookie: cookie,
      },
    });

    return Response.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        neteaseId: user.neteaseId,
      },
    });
  } catch (error) {
    console.error('Netease auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return Response.json(
      { error: `Failed to authenticate with Netease: ${errorMessage}` },
      { status: 500 }
    );
  }
}
