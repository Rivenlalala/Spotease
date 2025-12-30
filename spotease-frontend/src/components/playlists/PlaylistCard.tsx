import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Playlist } from '@/types/playlist';
import { Music } from 'lucide-react';

interface PlaylistCardProps {
  playlist: Playlist;
  onClick?: () => void;
  selected?: boolean;
}

const PlaylistCard = ({ playlist, onClick, selected = false }: PlaylistCardProps) => {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        selected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {playlist.imageUrl ? (
            <img
              src={playlist.imageUrl}
              alt={playlist.name}
              className="w-16 h-16 rounded object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
              <Music className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2">{playlist.name}</CardTitle>
            <CardDescription className="text-sm mt-1">
              {playlist.totalTracks} tracks
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {playlist.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-gray-600 line-clamp-2">{playlist.description}</p>
        </CardContent>
      )}
    </Card>
  );
};

export default PlaylistCard;
