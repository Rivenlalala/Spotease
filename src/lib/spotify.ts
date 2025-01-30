const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/spotify/callback';

const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read',
  'user-library-modify'
].join(' ');

export function getSpotifyAuthUrl() {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function getSpotifyTokens(code: string) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify tokens');
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function refreshSpotifyToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Spotify token');
  }

  return response.json() as Promise<{
    access_token: string;
    expires_in: number;
  }>;
}

export async function getSpotifyUser(accessToken: string) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify user');
  }

  return response.json() as Promise<{
    id: string;
    email: string;
    display_name: string;
    images: { url: string }[];
  }>;
}

export async function searchTracks(query: string, accessToken: string) {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: '20'
  });

  const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to search tracks');
  }

  return response.json() as Promise<{
    tracks: {
      items: Array<{
        id: string;
        name: string;
        artists: Array<{ name: string }>;
        album: { name: string };
      }>;
    };
  }>;
}

export async function addTracksToPlaylist(playlistId: string, trackUris: string[], accessToken: string) {
  // Handle liked songs differently
  const endpoint = playlistId === 'liked-songs'
    ? 'https://api.spotify.com/v1/me/tracks'
    : `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

  const uris = trackUris.map(id => `spotify:track:${id}`);
  const body = playlistId === 'liked-songs'
    ? { ids: trackUris } // For liked songs, send { ids: [...] }
    : { uris };

  try {
    const response = await fetch(endpoint, {
      method: playlistId === 'liked-songs' ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Spotify API error:', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        body,
        error: errorData
      });

      if (response.status === 401) {
        throw new Error('Spotify token expired');
      } else if (response.status === 403) {
        throw new Error('Not authorized to modify this playlist');
      } else if (response.status === 404) {
        throw new Error('Playlist not found');
      }
      
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    // For liked songs, just return success as it doesn't return a body
    if (playlistId === 'liked-songs') {
      return { success: true };
    }

    // For regular playlists, parse the JSON response
    try {
      return await response.json();
    } catch (error) {
      console.error('Failed to parse response:', error);
      // Return success anyway since the request succeeded
      return { success: true };
    }
  } catch (error) {
    console.error('Failed to add tracks:', error);
    throw error;
  }
}
