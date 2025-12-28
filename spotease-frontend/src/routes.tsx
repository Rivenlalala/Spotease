import { createBrowserRouter } from 'react-router-dom';
import Landing from '@/pages/Landing';
import Dashboard from '@/pages/Dashboard';
import NewConversion from '@/pages/NewConversion';
import ReviewMatches from '@/pages/ReviewMatches';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/conversion/new',
    element: <NewConversion />,
  },
  {
    path: '/conversion/:jobId/review',
    element: <ReviewMatches />,
  },
]);
