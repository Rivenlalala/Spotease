import apiClient from './client';
import { Playlist, Platform } from '@/types/playlist';

export const playlistsApi = {
  // Get Spotify playlists
  getSpotifyPlaylists: async (): Promise<Playlist[]> => {
    const response = await apiClient.get<Playlist[]>('/api/playlists/spotify');
    return response.data;
  },

  // Get NetEase playlists
  getNeteasePlaylists: async (): Promise<Playlist[]> => {
    const response = await apiClient.get<Playlist[]>('/api/playlists/netease');
    return response.data;
  },

  // Get single playlist details
  getPlaylistDetails: async (platform: Platform, playlistId: string): Promise<Playlist> => {
    const platformPath = platform.toLowerCase();
    const response = await apiClient.get<Playlist>(`/api/playlists/${platformPath}/${playlistId}`);
    return response.data;
  },
};
