export interface User {
  id: string;
  email: string;
  spotifyUserId?: string;
  neteaseUserId?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  userId?: string;
  email?: string;
  spotifyConnected: boolean;
  neteaseConnected: boolean;
}
