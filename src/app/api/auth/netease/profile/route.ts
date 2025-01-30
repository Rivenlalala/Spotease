import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId, profile } = await request.json();

    if (!userId || !profile) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!profile.userId || !profile.nickname || !profile.avatarUrl) {
      return Response.json({ error: "Invalid profile data" }, { status: 400 });
    }

    // Update user with Netease profile
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        neteaseId: profile.userId.toString(),
        neteaseName: profile.nickname,
        neteaseAvatar: profile.avatarUrl,
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
    console.error("Netease profile update error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return Response.json(
      { error: `Failed to update Netease profile: ${errorMessage}` },
      { status: 500 },
    );
  }
}
