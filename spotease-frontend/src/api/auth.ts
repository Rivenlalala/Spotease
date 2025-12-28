import apiClient from "./client";

export interface AuthStatus {
  isAuthenticated: boolean;
  spotifyConnected: boolean;
  neteaseConnected: boolean;
  user?: {
    id: string;
    spotifyId?: string;
    neteaseId?: string;
    displayName?: string;
  };
}

export interface SpotifyLoginResponse {
  authUrl: string;
}

export interface NeteaseQRResponse {
  key: string;
  qrimg: string;
}

export interface NeteaseQRStatusResponse {
  code: number;
  message: string;
  cookie?: string;
}

export const authApi = {
  getStatus: async (): Promise<AuthStatus> => {
    const response = await apiClient.get<AuthStatus>("/api/auth/status");
    return response.data;
  },

  getSpotifyLoginUrl: async (): Promise<SpotifyLoginResponse> => {
    const response = await apiClient.get<SpotifyLoginResponse>("/api/auth/spotify/login");
    return response.data;
  },

  generateNeteaseQR: async (): Promise<NeteaseQRResponse> => {
    const response = await apiClient.get<NeteaseQRResponse>("/api/auth/netease/qr/generate");
    return response.data;
  },

  checkNeteaseQRStatus: async (key: string): Promise<NeteaseQRStatusResponse> => {
    const response = await apiClient.get<NeteaseQRStatusResponse>(`/api/auth/netease/qr/status?key=${key}`);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/api/auth/logout");
  },
};
