import { getSpotifyAuthUrl } from '@/lib/spotify';
import { redirect } from 'next/navigation';

export async function GET() {
  const authUrl = getSpotifyAuthUrl();
  redirect(authUrl);
}
