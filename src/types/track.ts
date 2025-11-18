import type { NeteaseTrack } from "./netease";
import type { SpotifyTrack } from "./spotify";

// Generic track representation for UI
export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  platform: "SPOTIFY" | "NETEASE";
  duration?: number;
}

// Track with optional pairing info
export interface TrackWithPairing extends Track {
  pairedTrackId?: string;
  pairedTrack?: Track;
}

// Track pairing from database
export interface TrackPairingInfo {
  id: string;
  spotifyTrackId: string;
  neteaseTrackId: string;
}

// For converting API responses to generic format
export function spotifyTrackToGeneric(track: SpotifyTrack): Track {
  return {
    id: track.id,
    name: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    album: track.album.name,
    platform: "SPOTIFY",
    duration: track.duration_ms,
  };
}

export function neteaseTrackToGeneric(track: NeteaseTrack): Track {
  return {
    id: String(track.id),
    name: track.name,
    artist: track.ar.map((a) => a.name).join(", "),
    album: track.al.name,
    platform: "NETEASE",
    duration: track.dt,
  };
}
