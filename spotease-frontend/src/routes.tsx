import { createBrowserRouter } from "react-router-dom";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import NewConversion from "@/pages/NewConversion";
import ReviewMatches from "@/pages/ReviewMatches";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/conversion/new",
    element: (
      <ProtectedRoute>
        <NewConversion />
      </ProtectedRoute>
    ),
  },
  {
    path: "/conversion/:jobId/review",
    element: (
      <ProtectedRoute>
        <ReviewMatches />
      </ProtectedRoute>
    ),
  },
]);
