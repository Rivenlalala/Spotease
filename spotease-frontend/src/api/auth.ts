import apiClient from "./client";

export interface AuthStatus {
  authenticated: boolean;
  userId?: number;
  spotifyConnected: boolean;
  neteaseConnected: boolean;
}

export interface SpotifyLoginResponse {
  authUrl: string;
}

export interface NeteaseQRResponse {
  message: string;
  qrKey: string;
  qrImage: string;
}

export interface NeteaseQRStatusResponse {
  status: string;
  message: string;
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
    const response = await apiClient.post<NeteaseQRResponse>("/api/auth/netease/qr");
    return response.data;
  },

  checkNeteaseQRStatus: async (key: string): Promise<NeteaseQRStatusResponse> => {
    const response = await apiClient.get<NeteaseQRStatusResponse>(`/api/auth/netease/qr/status?key=${key}`);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/api/auth/logout");
  },

  submitNeteaseCookie: async (cookie: string): Promise<void> => {
    await apiClient.post("/api/auth/netease/cookie", { cookie });
  },
};
