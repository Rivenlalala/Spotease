export interface QRKeyResponse {
  code: number;
  data: {
    code: number;
    unikey: string;
  };
}

export interface QRImageResponse {
  code: number;
  data: {
    qrurl: string;
    qrimg: string;
  };
}

export interface QRCheckResponse {
  code: number;
  message?: string;
  cookie?: string;
}

export interface LoginStatusResponse {
  data: {
    code: number;
    profile: {
      userId: number;
      nickname: string;
      avatarUrl: string;
    };
  };
}

export interface NeteasePlaylist {
  id: number;
  name: string;
  userId: number;
  description: string | null;
  trackCount: number;
  playCount: number;
  coverImgUrl: string;
  createTime: number;
  updateTime: number;
  ordered: boolean;
}

export interface NeteaseTrack {
  id: number;
  name: string;
  ar: Array<{
    id: number;
    name: string;
  }>;
  al: {
    id: number;
    name: string;
    picUrl: string;
  };
  dt: number; // duration in ms
}

export interface PlaylistResponse {
  code: number;
  playlist: NeteasePlaylist[];
  more: boolean;
  version: string;
}

export interface TracksResponse {
  code: number;
  songs: NeteaseTrack[];
}

export interface SearchResponse {
  result: {
    songs: NeteaseTrack[];
    hasMore: boolean;
    songCount: number;
  };
  code: number;
}
