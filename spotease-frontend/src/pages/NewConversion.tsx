import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { playlistsApi } from '@/api/playlists';
import { conversionsApi } from '@/api/conversions';
import Layout from '@/components/layout/Layout';
import PlaylistGrid from '@/components/playlists/PlaylistGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Platform, Playlist } from '@/types/playlist';
import { ConversionMode } from '@/types/conversion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const NewConversion = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sourcePlatform, setSourcePlatform] = useState<Platform | null>(null);
  const [sourcePlaylist, setSourcePlaylist] = useState<Playlist | null>(null);
  const [conversionMode, setConversionMode] = useState<ConversionMode>(ConversionMode.CREATE);
  const [destinationPlaylistName, setDestinationPlaylistName] = useState('');
  const [destinationPlaylist, setDestinationPlaylist] = useState<Playlist | null>(null);

  // Fetch playlists based on selected source platform
  const { data: spotifyPlaylists, isLoading: spotifyLoading } = useQuery({
    queryKey: ['playlists', 'spotify'],
    queryFn: playlistsApi.getSpotifyPlaylists,
    enabled: sourcePlatform === Platform.SPOTIFY,
  });

  const { data: neteasePlaylists, isLoading: neteaseLoading } = useQuery({
    queryKey: ['playlists', 'netease'],
    queryFn: playlistsApi.getNeteasePlaylists,
    enabled: sourcePlatform === Platform.NETEASE,
  });

  // Fetch destination playlists for UPDATE mode
  const destinationPlatform = sourcePlatform === Platform.SPOTIFY ? Platform.NETEASE : Platform.SPOTIFY;

  const { data: destinationPlaylists, isLoading: destinationLoading } = useQuery({
    queryKey: ['playlists', destinationPlatform?.toLowerCase()],
    queryFn: destinationPlatform === Platform.SPOTIFY
      ? playlistsApi.getSpotifyPlaylists
      : playlistsApi.getNeteasePlaylists,
    enabled: step === 3 && conversionMode === ConversionMode.UPDATE,
  });

  // Create conversion mutation
  const createConversionMutation = useMutation({
    mutationFn: conversionsApi.createConversion,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onSuccess: (_job) => {
      toast({
        title: 'Conversion started',
        description: 'Your playlist conversion is now in progress',
      });
      navigate('/dashboard');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to start conversion',
        variant: 'destructive',
      });
    },
  });

  const handlePlatformSelect = (platform: Platform) => {
    setSourcePlatform(platform);
    setStep(2);
  };

  const handlePlaylistSelect = (playlist: Playlist) => {
    setSourcePlaylist(playlist);
  };

  const handleNextFromPlaylistSelect = () => {
    if (!sourcePlaylist) return;
    setDestinationPlaylistName(`${sourcePlaylist.name} (Converted)`);
    setStep(3);
  };

  const handleStartConversion = () => {
    if (!sourcePlaylist || !sourcePlatform) return;

    const request = {
      sourcePlatform,
      sourcePlaylistId: sourcePlaylist.id,
      mode: conversionMode,
      destinationPlaylistName:
        conversionMode === ConversionMode.CREATE
          ? destinationPlaylistName
          : destinationPlaylist!.name,
      destinationPlaylistId:
        conversionMode === ConversionMode.UPDATE
          ? destinationPlaylist!.id
          : undefined,
    };

    createConversionMutation.mutate(request);
  };

  const canProceedToFinal =
    (conversionMode === ConversionMode.CREATE && destinationPlaylistName.trim().length > 0) ||
    (conversionMode === ConversionMode.UPDATE && destinationPlaylist !== null);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">New Conversion</h1>
          <p className="text-gray-600 mt-1">
            Step {step} of 3
          </p>
        </div>

        {/* Step 1: Select Source Platform */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Select Source Platform</CardTitle>
                <CardDescription>
                  Choose where you want to convert from
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-32 text-lg"
                  onClick={() => handlePlatformSelect(Platform.SPOTIFY)}
                >
                  Spotify
                </Button>
                <Button
                  variant="outline"
                  className="h-32 text-lg"
                  onClick={() => handlePlatformSelect(Platform.NETEASE)}
                >
                  NetEase Music
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Select Source Playlist */}
        {step === 2 && sourcePlatform && (
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Playlist from {sourcePlatform}</CardTitle>
                <CardDescription>
                  Choose the playlist you want to convert
                </CardDescription>
              </CardHeader>
            </Card>

            <PlaylistGrid
              playlists={sourcePlatform === Platform.SPOTIFY ? spotifyPlaylists || [] : neteasePlaylists || []}
              isLoading={sourcePlatform === Platform.SPOTIFY ? spotifyLoading : neteaseLoading}
              onPlaylistClick={handlePlaylistSelect}
              selectedPlaylistId={sourcePlaylist?.id}
            />

            {sourcePlaylist && (
              <div className="mt-6 flex justify-end">
                <Button onClick={handleNextFromPlaylistSelect} size="lg">
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Configure Destination */}
        {step === 3 && sourcePlaylist && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Mode</CardTitle>
                <CardDescription>
                  Choose how you want to convert
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    conversionMode === ConversionMode.CREATE
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                  onClick={() => {
                    setConversionMode(ConversionMode.CREATE);
                    setDestinationPlaylist(null);
                  }}
                >
                  <h3 className="font-semibold">Create New Playlist</h3>
                  <p className="text-sm text-gray-600">
                    Create a new playlist on {destinationPlatform}
                  </p>
                </div>

                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    conversionMode === ConversionMode.UPDATE
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                  onClick={() => {
                    setConversionMode(ConversionMode.UPDATE);
                  }}
                >
                  <h3 className="font-semibold">Update Existing Playlist</h3>
                  <p className="text-sm text-gray-600">
                    Add missing tracks to an existing playlist
                  </p>
                </div>
              </CardContent>
            </Card>

            {conversionMode === ConversionMode.CREATE && (
              <Card>
                <CardHeader>
                  <CardTitle>Destination Playlist Name</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={destinationPlaylistName}
                    onChange={(e) => setDestinationPlaylistName(e.target.value)}
                    placeholder="Enter playlist name"
                  />
                </CardContent>
              </Card>
            )}

            {conversionMode === ConversionMode.UPDATE && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Destination Playlist</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlaylistGrid
                    playlists={destinationPlaylists || []}
                    isLoading={destinationLoading}
                    onPlaylistClick={setDestinationPlaylist}
                    selectedPlaylistId={destinationPlaylist?.id}
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                onClick={handleStartConversion}
                disabled={!canProceedToFinal || createConversionMutation.isPending}
                size="lg"
              >
                {createConversionMutation.isPending ? 'Starting...' : 'Start Conversion'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NewConversion;
