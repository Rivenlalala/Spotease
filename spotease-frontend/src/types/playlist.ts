export enum Platform {
  SPOTIFY = "SPOTIFY",
  NETEASE = "NETEASE",
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  totalTracks: number;
  platform: Platform;
  imageUrl?: string;
}
