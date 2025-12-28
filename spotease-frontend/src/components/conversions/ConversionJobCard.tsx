import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { ConversionJob } from '@/types/conversion';
import { JobStatus } from '@/types/conversion';
import { ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ConversionJobCardProps {
  job: ConversionJob;
}

const ConversionJobCard = ({ job }: ConversionJobCardProps) => {
  const navigate = useNavigate();

  const progress = job.totalTracks > 0
    ? (job.processedTracks / job.totalTracks) * 100
    : 0;

  const getStatusIcon = () => {
    switch (job.status) {
      case JobStatus.COMPLETED:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case JobStatus.FAILED:
        return <XCircle className="w-5 h-5 text-red-600" />;
      case JobStatus.PROCESSING:
      case JobStatus.QUEUED:
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case JobStatus.REVIEW_PENDING:
        return <Clock className="w-5 h-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case JobStatus.COMPLETED:
        return 'text-green-600';
      case JobStatus.FAILED:
        return 'text-red-600';
      case JobStatus.PROCESSING:
      case JobStatus.QUEUED:
        return 'text-blue-600';
      case JobStatus.REVIEW_PENDING:
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm uppercase tracking-wide">{job.sourcePlatform}</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="text-sm uppercase tracking-wide">{job.destinationPlatform}</span>
            </CardTitle>
            <CardDescription className="mt-1">
              {job.sourcePlaylistName} → {job.destinationPlaylistName}
            </CardDescription>
          </div>
          <div className={`text-sm font-medium ${getStatusColor()}`}>
            {job.status.replace('_', ' ')}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{job.processedTracks} / {job.totalTracks} tracks</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">High Confidence</p>
            <p className="text-lg font-semibold text-green-600">{job.highConfidenceMatches}</p>
          </div>
          <div>
            <p className="text-gray-600">Low Confidence</p>
            <p className="text-lg font-semibold text-orange-600">{job.lowConfidenceMatches}</p>
          </div>
          <div>
            <p className="text-gray-600">Failed</p>
            <p className="text-lg font-semibold text-red-600">{job.failedTracks}</p>
          </div>
        </div>

        {/* Actions */}
        {job.status === JobStatus.REVIEW_PENDING && (
          <Button
            onClick={() => navigate(`/conversion/${job.id}/review`)}
            className="w-full"
          >
            Review {job.lowConfidenceMatches + job.failedTracks} Matches
          </Button>
        )}

        {job.status === JobStatus.COMPLETED && (
          <div className="text-center text-sm text-gray-600">
            Completed {new Date(job.completedAt!).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversionJobCard;
