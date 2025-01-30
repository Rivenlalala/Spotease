import { Platform } from '@prisma/client';

export interface Playlist {
  id: string;
  name: string;
  platform: Platform;
  trackCount: number;
  cover?: string | null;
  lastSynced?: string | null;
}

export interface PlaylistWithTracks extends Playlist {
  tracks: Array<{
    id: string;
    name: string;
    artist: string;
    album: string;
  }>;
}

export interface PlaylistPair {
  spotify: Playlist;
  netease: Playlist;
  lastSynced: string | null;
}
