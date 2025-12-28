import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/api/auth';
import { useToast } from '@/hooks/use-toast';

const SpotifyLoginButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSpotifyLogin = async () => {
    try {
      setIsLoading(true);
      const response = await authApi.getSpotifyLoginUrl();

      // Redirect to Spotify OAuth
      window.location.href = response.authUrl;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initiate Spotify login',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSpotifyLogin}
      disabled={isLoading}
      className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
    >
      {isLoading ? 'Connecting...' : 'Connect Spotify'}
    </Button>
  );
};

export default SpotifyLoginButton;
