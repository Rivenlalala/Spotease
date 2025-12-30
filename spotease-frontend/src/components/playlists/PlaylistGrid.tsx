import type { Playlist } from '@/types/playlist';
import PlaylistCard from './PlaylistCard';
import { Skeleton } from '@/components/ui/skeleton';

interface PlaylistGridProps {
  playlists: Playlist[];
  isLoading?: boolean;
  onPlaylistClick?: (playlist: Playlist) => void;
  selectedPlaylistId?: string;
}

const PlaylistGrid = ({
  playlists,
  isLoading = false,
  onPlaylistClick,
  selectedPlaylistId,
}: PlaylistGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No playlists found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {playlists.map((playlist) => (
        <PlaylistCard
          key={playlist.id}
          playlist={playlist}
          onClick={() => onPlaylistClick?.(playlist)}
          selected={selectedPlaylistId === playlist.id}
        />
      ))}
    </div>
  );
};

export default PlaylistGrid;
