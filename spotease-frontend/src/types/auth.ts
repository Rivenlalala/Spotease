export interface User {
  id: number;
  email: string;
  spotifyUserId?: string;
  neteaseUserId?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  userId?: number;
  email?: string;
  spotifyConnected: boolean;
  neteaseConnected: boolean;
}
