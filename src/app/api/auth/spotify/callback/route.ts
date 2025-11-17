import { prisma } from "@/lib/db";
import { getSpotifyTokens, getSpotifyUser } from "@/lib/spotify";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=spotify_auth_denied`);
    }

    if (!code) {
      return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=no_code`);
    }

    // Exchange code for tokens
    const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = await getSpotifyTokens(code);

    // Get user info from Spotify
    const spotifyUser = await getSpotifyUser(accessToken);

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Create or update user
    const user = await prisma.user.upsert({
      where: {
        spotifyId: spotifyUser.id,
      },
      create: {
        email: spotifyUser.email,
        name: spotifyUser.display_name,
        image: spotifyUser.images[0]?.url,
        spotifyId: spotifyUser.id,
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken,
        spotifyExpiresAt: expiresAt,
      },
      update: {
        email: spotifyUser.email,
        name: spotifyUser.display_name,
        image: spotifyUser.images[0]?.url,
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken,
        spotifyExpiresAt: expiresAt,
      },
    });

    // Redirect to dashboard with success and set session cookie
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?userId=${user.id}`);

    // Set session cookie (expires in 30 days)
    response.cookies.set("spotease_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Spotify callback error:", error);
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=spotify_auth_failed`);
  }
}
