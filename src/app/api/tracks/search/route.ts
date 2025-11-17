import { type NextRequest } from "next/server";
import { searchTracks as searchNeteaseTracks } from "@/lib/netease";
import { searchTracks as searchSpotifyTracks, refreshSpotifyToken } from "@/lib/spotify";
import { prisma } from "@/lib/db";

type Platform = "SPOTIFY" | "NETEASE";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const platform = searchParams.get("platform") as Platform;
    const userId = searchParams.get("userId");

    if (!query || !platform || !userId) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (platform !== "SPOTIFY" && platform !== "NETEASE") {
      return Response.json({ error: "Invalid platform" }, { status: 400 });
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
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (platform === "SPOTIFY") {
      if (!user.spotifyRefreshToken) {
        return Response.json({ error: "User not connected to Spotify" }, { status: 400 });
      }

      // Always refresh token to ensure validity
      const { access_token: accessToken } = await refreshSpotifyToken(user.spotifyRefreshToken);

      const results = await searchSpotifyTracks(query, accessToken);
      return Response.json({
        tracks: results.tracks.items.map((track) => ({
          id: track.id,
          name: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          album: track.album.name,
          platform: "SPOTIFY" as const,
        })),
      });
    } 
    if (!user.neteaseCookie) {
      return Response.json({ error: "User not connected to Netease" }, { status: 400 });
    }

    const results = await searchNeteaseTracks(query, user.neteaseCookie);
    if (!results.result?.songs) {
      return Response.json({ tracks: [] });
    }

    return Response.json({
      tracks: results.result.songs.map((song) => {
        let artistString = "";
        if (song.ar && song.ar.length > 0) {
          artistString = song.ar.map((a) => a.name).join(", ");
        }

        return {
          id: song.id.toString(),
          name: song.name,
          artist: artistString,
          album: song.al?.name || "Unknown Album",
          platform: "NETEASE" as const,
        };
      }),
    });
    
  } catch (error) {
    console.error("Error searching tracks:", error);
    return Response.json({ error: "Failed to search tracks" }, { status: 500 });
  }
}
