const NETEASE_API_BASE = 'https://netease-api.rivenlalala.xyz';

interface QRKeyResponse {
  code: number;
  data: {
    code: number;
    unikey: string;
  };
}

interface QRImageResponse {
  code: number;
  data: {
    qrurl: string;
    qrimg: string;
  };
}

interface QRCheckResponse {
  code: number;
  message?: string;
  cookie?: string;
}

interface LoginStatusResponse {
  data: {
    code: number;
    profile: {
      userId: number;
      nickname: string;
      avatarUrl: string;
    };
  };
}

// Extract MUSIC_U cookie from the full cookie string
export function extractMusicUCookie(cookies: string): string {
  const musicUMatch = cookies.match(/MUSIC_U=([^;]+)/);
  if (!musicUMatch) {
    throw new Error('MUSIC_U cookie not found');
  }
  return `MUSIC_U=${musicUMatch[1]}`;
}

export async function getLoginStatus(cookie: string): Promise<LoginStatusResponse> {
  const response = await fetch(
    `${NETEASE_API_BASE}/login/status?timestamp=${Date.now()}`,
    {
      headers: {
        Cookie: cookie,
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get login status');
  }

  const data = await response.json();
  if (!data.data?.profile) {
    console.error('Invalid login status response:', data);
    throw new Error('Invalid login status response');
  }

  return data;
}

export async function generateQRKey(): Promise<string> {
  const response = await fetch(`${NETEASE_API_BASE}/login/qr/key?timestamp=${Date.now()}`);
  if (!response.ok) {
    throw new Error('Failed to generate QR key');
  }
  const data: QRKeyResponse = await response.json();
  return data.data.unikey;
}

export async function generateQRCode(key: string): Promise<string> {
  const response = await fetch(
    `${NETEASE_API_BASE}/login/qr/create?key=${key}&qrimg=true&timestamp=${Date.now()}`
  );
  if (!response.ok) {
    throw new Error('Failed to generate QR code');
  }
  const data: QRImageResponse = await response.json();
  return data.data.qrimg;
}

export async function checkQRStatus(key: string): Promise<QRCheckResponse> {
  const response = await fetch(
    `${NETEASE_API_BASE}/login/qr/check?key=${key}&timestamp=${Date.now()}`
  );
  if (!response.ok) {
    throw new Error('Failed to check QR status');
  }
  return response.json();
}

export async function getUserPlaylists(cookie: string) {
  const response = await fetch(`${NETEASE_API_BASE}/user/playlist`, {
    headers: {
      Cookie: cookie,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user playlists');
  }

  return response.json();
}

export async function getPlaylistTracks(id: string, cookie: string) {
  const response = await fetch(`${NETEASE_API_BASE}/playlist/track/all?id=${id}`, {
    headers: {
      Cookie: cookie,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get playlist tracks');
  }

  return response.json();
}

export async function createPlaylist(name: string, cookie: string) {
  const response = await fetch(`${NETEASE_API_BASE}/playlist/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      name,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create playlist');
  }

  return response.json();
}

export async function addTracksToPlaylist(playlistId: string, trackIds: string[], cookie: string) {
  const response = await fetch(`${NETEASE_API_BASE}/playlist/tracks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      op: 'add',
      pid: playlistId,
      tracks: trackIds.join(','),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to add tracks to playlist');
  }

  return response.json();
}
