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
}

export interface TrackMatch {
  id: number;
  sourceTrackId: string;
  sourceTrackName: string;
  sourceArtist: string;
  sourceAlbum?: string;
  sourceDuration: number;
  sourceISRC?: string;
  destinationTrackId?: string;
  destinationTrackName?: string;
  destinationArtist?: string;
  matchConfidence: number;
  status: MatchStatus;
  errorMessage?: string;
}

export interface TrackMatchCandidate {
  track: Track;
  confidence: number;
}
