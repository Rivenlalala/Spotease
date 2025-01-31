export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  spotifyId: string | null;
  spotifyAccessToken: string | null;
  spotifyRefreshToken: string | null;
  spotifyExpiresAt: Date | null;
  neteaseId: string | null;
  neteaseName: string | null;
  neteaseAvatar: string | null;
}
