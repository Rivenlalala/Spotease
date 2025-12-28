import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { conversionsApi } from '@/api/conversions';
import type { ConversionJob } from '@/types/conversion';
import Layout from '@/components/layout/Layout';
import ConversionJobCard from '@/components/conversions/ConversionJobCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { authStatus, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Fetch conversion jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['conversions'],
    queryFn: conversionsApi.getConversions,
    enabled: authStatus?.authenticated === true,
  });

  // WebSocket for real-time updates
  useWebSocket({
    enabled: authStatus?.authenticated === true,
    onJobUpdate: (updatedJob) => {
      // Update the job in the cache
      queryClient.setQueryData(['conversions'], (oldJobs: ConversionJob[] | undefined) => {
        if (!oldJobs) return [updatedJob];
        return oldJobs.map((job: ConversionJob) =>
          job.id === updatedJob.id ? updatedJob : job
        );
      });

      // Also update individual job cache if it exists
      queryClient.setQueryData(['conversion', updatedJob.id], updatedJob);
    },
  });

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!authLoading && !authStatus?.authenticated) {
      navigate('/');
    }
  }, [authStatus, authLoading, navigate]);

  if (authLoading || !authStatus?.authenticated) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-600">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your playlist conversions</p>
          </div>
          <Button onClick={() => navigate('/conversion/new')} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            New Conversion
          </Button>
        </div>

        {jobsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : jobs && jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <ConversionJobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-4">No conversions yet</p>
            <Button onClick={() => navigate('/conversion/new')}>
              Create Your First Conversion
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
