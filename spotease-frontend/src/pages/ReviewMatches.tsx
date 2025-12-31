import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversionsApi } from '@/api/conversions';
import Layout from '@/components/layout/Layout';
import TrackMatchCard from '@/components/conversions/TrackMatchCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const ReviewMatches = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch pending matches
  const { data: matches, isLoading } = useQuery({
    queryKey: ['pendingMatches', jobId],
    queryFn: () => conversionsApi.getPendingMatches(Number(jobId)),
    enabled: !!jobId,
  });

  const currentMatch = matches?.[currentIndex];

  // Approve match mutation
  const approveMutation = useMutation({
    mutationFn: ({
      jobId,
      matchId,
      alternativeTrack,
    }: {
      jobId: number;
      matchId: number;
      alternativeTrack?: {
        destinationTrackId: string;
        destinationTrackName: string;
        destinationArtist: string;
        destinationDuration: number;
        destinationAlbumImageUrl?: string;
      };
    }) => conversionsApi.approveMatch(jobId, matchId, alternativeTrack),
    onSuccess: () => {
      toast({
        title: 'Match approved',
        description: 'Track added to destination playlist',
      });
      moveToNext();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to approve match',
        variant: 'destructive',
      });
    },
  });

  // Skip match mutation
  const skipMutation = useMutation({
    mutationFn: ({ jobId, matchId }: { jobId: number; matchId: number }) =>
      conversionsApi.skipMatch(jobId, matchId),
    onSuccess: () => {
      toast({
        title: 'Match skipped',
        description: 'Track will not be added to destination playlist',
      });
      moveToNext();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to skip match',
        variant: 'destructive',
      });
    },
  });

  const handleSearch = async (query: string) => {
    if (!jobId) throw new Error('No job ID');
    return conversionsApi.searchAlternatives(Number(jobId), query);
  };

  const moveToNext = () => {
    if (matches && currentIndex < matches.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All matches reviewed
      queryClient.invalidateQueries({ queryKey: ['conversions'] });
      toast({
        title: 'Review complete',
        description: 'All matches have been reviewed',
      });
      navigate('/dashboard');
    }
  };

  const handleApprove = (alternativeTrack?: {
    destinationTrackId: string;
    destinationTrackName: string;
    destinationArtist: string;
    destinationDuration: number;
    destinationAlbumImageUrl?: string;
  }) => {
    if (!currentMatch || !jobId) return;
    approveMutation.mutate({
      jobId: Number(jobId),
      matchId: currentMatch.matchId,
      alternativeTrack,
    });
  };

  const handleSkip = () => {
    if (!currentMatch || !jobId) return;
    skipMutation.mutate({ jobId: Number(jobId), matchId: currentMatch.matchId });
  };

  const isProcessing = approveMutation.isPending || skipMutation.isPending;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-600">Loading matches...</p>
        </div>
      </Layout>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">No matches to review</h2>
          <p className="text-gray-600 mb-8">All tracks have been processed</p>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Review Matches</h1>
          <p className="text-gray-600 mt-1">
            Review {currentIndex + 1} of {matches.length}
          </p>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / matches.length) * 100}%` }}
            />
          </div>
        </div>

        {currentMatch && (
          <TrackMatchCard
            key={currentMatch.matchId}
            match={currentMatch}
            onApprove={handleApprove}
            onSkip={handleSkip}
            onSearch={handleSearch}
            isProcessing={isProcessing}
          />
        )}
      </div>
    </Layout>
  );
};

export default ReviewMatches;
