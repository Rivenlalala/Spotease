import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import SpotifyLoginButton from '@/components/auth/SpotifyLoginButton';
import NeteaseQRModal from '@/components/auth/NeteaseQRModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Landing = () => {
  const { authStatus, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showNeteaseModal, setShowNeteaseModal] = useState(false);

  useEffect(() => {
    // Redirect to dashboard if both platforms are connected
    if (authStatus?.spotifyConnected && authStatus?.neteaseConnected) {
      navigate('/dashboard');
    }
  }, [authStatus, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            Spotease
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Convert playlists between Spotify and NetEase Music
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Spotify Card */}
            <Card className={authStatus?.spotifyConnected ? 'border-green-500 bg-green-50' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Spotify
                  {authStatus?.spotifyConnected && (
                    <span className="text-green-600 text-sm">✓ Connected</span>
                  )}
                </CardTitle>
                <CardDescription>
                  Connect your Spotify account to start converting playlists
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!authStatus?.spotifyConnected ? (
                  <SpotifyLoginButton />
                ) : (
                  <Button disabled className="w-full">
                    Connected
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* NetEase Card */}
            <Card className={authStatus?.neteaseConnected ? 'border-green-500 bg-green-50' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  NetEase Music
                  {authStatus?.neteaseConnected && (
                    <span className="text-green-600 text-sm">✓ Connected</span>
                  )}
                </CardTitle>
                <CardDescription>
                  Scan QR code with your NetEase Music mobile app
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!authStatus?.neteaseConnected ? (
                  <Button
                    onClick={() => setShowNeteaseModal(true)}
                    disabled={!authStatus?.spotifyConnected}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    Connect NetEase
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    Connected
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {authStatus?.spotifyConnected && !authStatus?.neteaseConnected && (
            <p className="mt-8 text-sm text-gray-600">
              Connect NetEase Music to continue
            </p>
          )}

          {authStatus?.spotifyConnected && authStatus?.neteaseConnected && (
            <div className="mt-8">
              <Button
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="px-8"
              >
                Go to Dashboard →
              </Button>
            </div>
          )}
        </div>
      </div>

      <NeteaseQRModal
        open={showNeteaseModal}
        onOpenChange={setShowNeteaseModal}
      />
    </div>
  );
};

export default Landing;
