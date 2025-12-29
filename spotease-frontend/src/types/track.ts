export enum MatchStatus {
  AUTO_MATCHED = "AUTO_MATCHED",
  PENDING_REVIEW = "PENDING_REVIEW",
  USER_APPROVED = "USER_APPROVED",
  USER_SKIPPED = "USER_SKIPPED",
  FAILED = "FAILED",
}

export interface Track {
  id: string;
  name: string;
  artists: string[];
  album?: string;
  duration: number;
  isrc?: string;
  imageUrl?: string;
}

export interface TrackMatch {
  matchId: number;
  sourceTrackId: string;
  sourceTrackName: string;
  sourceArtist: string;
  sourceAlbum?: string;
  sourceDuration: number;
  sourceISRC?: string;
  sourceImageUrl?: string;
  destinationTrackId?: string;
  destinationTrackName?: string;
  destinationArtist?: string;
  destinationDuration?: number;
  destinationImageUrl?: string;
  matchConfidence: number;
  status: MatchStatus;
  errorMessage?: string;
}

export interface TrackMatchCandidate {
  track: Track;
  confidence: number;
}

// Search result from destination platform
export interface SearchTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumImageUrl?: string;
  duration: number; // in milliseconds
}
