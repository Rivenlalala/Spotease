import apiClient from "./client";
import { ConversionJob, CreateConversionRequest } from "@/types/conversion";
import { TrackMatch } from "@/types/track";

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
      `/api/conversions/${jobId}/pending-matches`
    );
    return response.data;
  },

  // Approve a match
  approveMatch: async (jobId: number, matchId: number): Promise<void> => {
    await apiClient.post(
      `/api/conversions/${jobId}/matches/${matchId}/approve`
    );
  },

  // Skip a match
  skipMatch: async (jobId: number, matchId: number): Promise<void> => {
    await apiClient.post(`/api/conversions/${jobId}/matches/${matchId}/skip`);
  },

  // Search for alternative matches
  searchAlternatives: async (
    jobId: number,
    matchId: number,
    query: string
  ): Promise<TrackMatch[]> => {
    const response = await apiClient.post<TrackMatch[]>(
      `/api/conversions/${jobId}/matches/${matchId}/search`,
      { query }
    );
    return response.data;
  },
};
