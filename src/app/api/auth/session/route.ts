import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get("spotease_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ user: null });
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        spotifyId: true,
        neteaseId: true,
      },
    });

    if (!user) {
      // Clear invalid cookie
      const response = NextResponse.json({ user: null });
      response.cookies.delete("spotease_user_id");
      return response;
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ user: null });
  }
}
