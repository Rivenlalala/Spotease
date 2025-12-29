import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SearchTrack, TrackMatch } from '@/types/track';
import { Music, Check, X, Search } from 'lucide-react';

interface TrackMatchCardProps {
  match: TrackMatch;
  onApprove: (alternativeTrack?: {
    destinationTrackId: string;
    destinationTrackName: string;
    destinationArtist: string;
    destinationDuration: number;
    destinationAlbumImageUrl?: string;
  }) => void;
  onSkip: () => void;
  onSearch: (query: string) => Promise<SearchTrack[]>;
  isProcessing?: boolean;
}

const TrackMatchCard = ({ match, onApprove, onSkip, onSearch, isProcessing = false }: TrackMatchCardProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SearchTrack | null>(null);
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'text-green-600';
    if (confidence >= 0.60) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Track Match Review</CardTitle>
        <CardDescription className="text-center">
          Review and approve the suggested match
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Source Track */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Source Track</h3>
          <div className="flex items-start gap-3">
            {match.sourceImageUrl ? (
              <img
                src={match.sourceImageUrl}
                alt={match.sourceTrackName}
                className="w-12 h-12 rounded object-cover flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) {
                    fallback.classList.remove('hidden');
                  }
                }}
              />
            ) : null}
            <div
              className={
                match.sourceImageUrl
                  ? 'hidden w-12 h-12 bg-blue-200 rounded flex items-center justify-center flex-shrink-0'
                  : 'w-12 h-12 bg-blue-200 rounded flex items-center justify-center flex-shrink-0'
              }
            >
              <Music className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{match.sourceTrackName}</p>
              <p className="text-sm text-gray-600">{match.sourceArtist}</p>
              {match.sourceAlbum && (
                <p className="text-sm text-gray-500">{match.sourceAlbum}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Duration: {formatDuration(match.sourceDuration)}
              </p>
            </div>
          </div>
        </div>

        {/* Match Arrow and Confidence */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2">
            <span className="text-2xl">↓</span>
            <span className={`font-semibold ${getConfidenceColor(match.matchConfidence)}`}>
              {(match.matchConfidence * 100).toFixed(0)}% match
            </span>
          </div>
        </div>

        {/* Destination Track */}
        {match.destinationTrackId ? (
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-900 mb-2">Suggested Match</h3>
            <div className="flex items-start gap-3">
              {match.destinationImageUrl ? (
                <img
                  src={match.destinationImageUrl}
                  alt={match.destinationTrackName || 'Track'}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) {
                      fallback.classList.remove('hidden');
                    }
                  }}
                />
              ) : null}
              <div
                className={
                  match.destinationImageUrl
                    ? 'hidden w-12 h-12 bg-green-200 rounded flex items-center justify-center flex-shrink-0'
                    : 'w-12 h-12 bg-green-200 rounded flex items-center justify-center flex-shrink-0'
                }
              >
                <Music className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{match.destinationTrackName}</p>
                <p className="text-sm text-gray-600">{match.destinationArtist}</p>
                {match.destinationDuration && (
                  <p className="text-xs text-gray-500 mt-1">
                    Duration: {formatDuration(match.destinationDuration)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-red-900 mb-2">No Match Found</h3>
            <p className="text-sm text-gray-600">
              {match.errorMessage || 'Could not find a matching track on the destination platform'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={onSkip}
            variant="outline"
            className="flex-1"
            disabled={isProcessing}
          >
            <X className="w-4 h-4 mr-2" />
            Skip
          </Button>
          <Button
            onClick={onApprove}
            className="flex-1"
            disabled={isProcessing || !match.destinationTrackId}
          >
            <Check className="w-4 h-4 mr-2" />
            Approve Match
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackMatchCard;
