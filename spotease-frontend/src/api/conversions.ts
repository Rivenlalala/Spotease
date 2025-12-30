import apiClient from "./client";
import type { ConversionJob, CreateConversionRequest } from "@/types/conversion";
import type { SearchTrack, TrackMatch } from "@/types/track";

// Raw response types from backend (matching JSON field names)
interface SpotifyTrackResponse {
  id: string;
  name: string;
  artists: string[];
  album: string;
  duration_ms: number;
  albumImageUrl?: string;
}

interface NeteaseTrackResponse {
  id: string;
  name: string;
  ar: { id: string; name: string }[];
  al: { id: string; name: string; picUrl?: string };
  dt: number;
}

type RawSearchTrack = SpotifyTrackResponse | NeteaseTrackResponse;

// Normalize search results to a common format
function normalizeSearchTrack(raw: RawSearchTrack): SearchTrack {
  // Check if it's a Spotify track (has duration_ms)
  if ("duration_ms" in raw) {
    const spotify = raw as SpotifyTrackResponse;
    return {
      id: spotify.id,
      name: spotify.name,
      artists: spotify.artists || [],
      album: spotify.album || "",
      albumImageUrl: spotify.albumImageUrl,
      duration: spotify.duration_ms,
    };
  }

  // It's a NetEase track (has dt for duration)
  const netease = raw as NeteaseTrackResponse;
  return {
    id: String(netease.id),
    name: netease.name,
    artists: netease.ar?.map((a) => a.name) || [],
    album: netease.al?.name || "",
    albumImageUrl: netease.al?.picUrl,
    duration: netease.dt,
  };
}

export const conversionsApi = {
  // Create new conversion job
  createConversion: async (
    request: CreateConversionRequest
  ): Promise<ConversionJob> => {
    const response = await apiClient.post<ConversionJob>(
      "/api/conversions",
      request
    );
    return response.data;
  },

  // Get all user's conversion jobs
  getConversions: async (): Promise<ConversionJob[]> => {
    const response =
      await apiClient.get<ConversionJob[]>("/api/conversions");
    return response.data;
  },

  // Get single conversion job details
  getConversion: async (jobId: number): Promise<ConversionJob> => {
    const response = await apiClient.get<ConversionJob>(
      `/api/conversions/${jobId}`
    );
    return response.data;
  },

  // Delete conversion job
  deleteConversion: async (jobId: number): Promise<void> => {
    await apiClient.delete(`/api/conversions/${jobId}`);
  },

  // Get pending matches for review
  getPendingMatches: async (jobId: number): Promise<TrackMatch[]> => {
    const response = await apiClient.get<TrackMatch[]>(
      `/api/conversions/${jobId}/matches/pending`
    );
    return response.data;
  },

  // Approve a match (optionally with alternative destination)
  approveMatch: async (
    jobId: number,
    matchId: number,
    alternativeTrack?: {
      destinationTrackId: string;
      destinationTrackName: string;
      destinationArtist: string;
      destinationDuration: number;
      destinationAlbumImageUrl?: string;
    }
  ): Promise<void> => {
    await apiClient.post(
      `/api/conversions/${jobId}/matches/${matchId}/approve`,
      alternativeTrack || {}
    );
  },

  // Skip a match
  skipMatch: async (jobId: number, matchId: number): Promise<void> => {
    await apiClient.post(`/api/conversions/${jobId}/matches/${matchId}/skip`);
  },

  // Search for alternative matches on destination platform
  searchAlternatives: async (
    jobId: number,
    query: string
  ): Promise<SearchTrack[]> => {
    const response = await apiClient.get<RawSearchTrack[]>(
      `/api/conversions/${jobId}/matches/search`,
      { params: { query } }
    );
    return response.data.map(normalizeSearchTrack);
  },
};
