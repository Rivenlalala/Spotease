export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: SpotifyImage[];
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  images: SpotifyImage[];
  owner: {
    id: string;
    display_name?: string;
  };
  tracks: {
    total: number;
    items?: SpotifyTrackItem[];
  };
}

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: {
    name: string;
    images: SpotifyImage[];
  };
  duration_ms: number;
}

export interface SpotifyTrackItem {
  track: SpotifyTrack;
  added_at: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
}

export interface SpotifyError {
  error?: {
    status: number;
    message: string;
  };
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}
