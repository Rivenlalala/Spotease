import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authStatus, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authStatus?.authenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
