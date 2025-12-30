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

  const handleOpenSearch = async () => {
    setIsSearching(true);
    setSearchError(null);
    const initialQuery = `${match.sourceTrackName} ${match.sourceArtist}`;
    setSearchQuery(initialQuery);
    await performSearch(initialQuery);
  };

  const handleCloseSearch = () => {
    setIsSearching(false);
    setSearchResults([]);
    setSearchQuery('');
    setSearchError(null);
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setSearchError(null);
    try {
      const results = await onSearch(query);
      setSearchResults(results);
    } catch {
      setSearchError('Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleSelectTrack = (track: SearchTrack) => {
    setSelectedTrack(track);
    setIsSearching(false);
    setSearchResults([]);
  };

  const handleApprove = () => {
    if (selectedTrack) {
      onApprove({
        destinationTrackId: selectedTrack.id,
        destinationTrackName: selectedTrack.name,
        destinationArtist: selectedTrack.artists.join(', '),
        destinationDuration: Math.round(selectedTrack.duration / 1000), // Convert ms to seconds
        destinationAlbumImageUrl: selectedTrack.albumImageUrl,
      });
    } else {
      onApprove();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const SearchResultSkeleton = () => (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-lg animate-pulse">
          <div className="w-12 h-12 bg-gray-300 rounded flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-10" />
        </div>
      ))}
    </div>
  );

  const SearchResultsView = () => (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Search Results</h3>
        <button
          onClick={handleCloseSearch}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close search"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for tracks..."
          className="flex-1"
        />
        <Button type="submit" size="icon" variant="outline" disabled={isLoading}>
          <Search className="w-4 h-4" />
        </Button>
      </form>

      {isLoading ? (
        <SearchResultSkeleton />
      ) : searchError ? (
        <p className="text-sm text-red-600 text-center py-4">{searchError}</p>
      ) : searchResults.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-4">
          No tracks found. Try different keywords.
        </p>
      ) : (
        <div className="space-y-1">
          {searchResults.map((track) => (
            <button
              key={track.id}
              onClick={() => handleSelectTrack(track)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
            >
              {track.albumImageUrl ? (
                <img
                  src={track.albumImageUrl}
                  alt={track.album}
                  className="w-12 h-12 rounded flex-shrink-0 object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                  <Music className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{track.name}</p>
                <p className="text-sm text-gray-600 truncate">
                  {track.artists.join(', ')} • {track.album}
                </p>
              </div>
              <span className="text-sm text-gray-500 flex-shrink-0">
                {formatDuration(Math.round(track.duration / 1000))}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <Button variant="outline" onClick={handleCloseSearch}>
          Cancel
        </Button>
      </div>
    </div>
  );

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

        {/* Destination Track or Search View */}
        {isSearching ? (
          <SearchResultsView />
        ) : selectedTrack ? (
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-900 mb-2">Selected Track (Manual)</h3>
            <div className="flex items-start gap-3">
              {selectedTrack.albumImageUrl ? (
                <img
                  src={selectedTrack.albumImageUrl}
                  alt={selectedTrack.album}
                  className="w-12 h-12 rounded flex-shrink-0 object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-purple-200 rounded flex items-center justify-center flex-shrink-0">
                  <Music className="w-6 h-6 text-purple-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{selectedTrack.name}</p>
                <p className="text-sm text-gray-600">{selectedTrack.artists.join(', ')}</p>
                <p className="text-sm text-gray-500">{selectedTrack.album}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Duration: {formatDuration(Math.round(selectedTrack.duration / 1000))}
                </p>
              </div>
            </div>
          </div>
        ) : match.destinationTrackId ? (
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-900 mb-2">Suggested Match</h3>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-200 rounded flex items-center justify-center flex-shrink-0">
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
        {!isSearching && (
          <div className="space-y-3">
            <Button
              onClick={handleOpenSearch}
              variant="outline"
              className="w-full"
              disabled={isProcessing}
            >
              <Search className="w-4 h-4 mr-2" />
              Search Alternative
            </Button>
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
                onClick={handleApprove}
                className="flex-1"
                disabled={isProcessing || (!match.destinationTrackId && !selectedTrack)}
              >
                <Check className="w-4 h-4 mr-2" />
                Approve Match
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackMatchCard;
