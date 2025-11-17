import type { NeteasePlaylist } from "./netease";
import type { SpotifyPlaylist } from "./spotify";

// Generic playlist representation for UI
export interface Playlist {
  id: string;
  name: string;
  platform: "SPOTIFY" | "NETEASE";
  trackCount: number;
  cover?: string | null;
}

// Paired playlists with fresh data from APIs
export interface PlaylistPair {
  pairingId: string;
  spotify: SpotifyPlaylist;
  netease: NeteasePlaylist;
  createdAt: string;
}

// For converting API responses to generic format
export function spotifyPlaylistToGeneric(
  playlist: SpotifyPlaylist,
): Playlist {
  return {
    id: playlist.id,
    name: playlist.name,
    platform: "SPOTIFY",
    trackCount: playlist.tracks.total,
    cover: playlist.images[0]?.url || null,
  };
}

export function neteasePlaylistToGeneric(
  playlist: NeteasePlaylist,
): Playlist {
  return {
    id: String(playlist.id),
    name: playlist.name,
    platform: "NETEASE",
    trackCount: playlist.trackCount,
    cover: playlist.coverImgUrl || null,
  };
}
