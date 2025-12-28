import React, { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import type { AuthStatus } from '@/types/auth';

interface AuthContextType {
  authStatus: AuthStatus | undefined;
  isLoading: boolean;
  logout: () => void;
  refetchAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: authStatus, isLoading, refetch } = useQuery({
    queryKey: ['authStatus'],
    queryFn: authApi.getStatus,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(['authStatus'], {
        authenticated: false,
        spotifyConnected: false,
        neteaseConnected: false,
      });
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  const refetchAuth = () => {
    refetch();
  };

  return (
    <AuthContext.Provider value={{ authStatus, isLoading, logout, refetchAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
