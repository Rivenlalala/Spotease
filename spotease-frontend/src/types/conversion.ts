import { Platform } from "./playlist";

export enum ConversionMode {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
}

export enum JobStatus {
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  REVIEW_PENDING = "REVIEW_PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface ConversionJob {
  id: string;
  sourcePlatform: Platform;
  sourcePlaylistId: string;
  sourcePlaylistName: string;
  destinationPlatform: Platform;
  destinationPlaylistId?: string;
  destinationPlaylistName: string;
  mode: ConversionMode;
  status: JobStatus;
  totalTracks: number;
  processedTracks: number;
  highConfidenceMatches: number;
  lowConfidenceMatches: number;
  failedTracks: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateConversionRequest {
  sourcePlatform: Platform;
  sourcePlaylistId: string;
  mode: ConversionMode;
  destinationPlaylistName: string;
  destinationPlaylistId?: string;
}
