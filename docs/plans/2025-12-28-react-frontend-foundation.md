# React Frontend Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the foundational React frontend with authentication, playlist browsing, conversion dashboard, and real-time WebSocket updates for Spotease.

**Architecture:** Vite-powered React 19 application with TypeScript, using shadcn/ui components and Tailwind CSS for UI, TanStack Query for server state management, Axios for HTTP communication with Spring Boot backend (localhost:8080), and native WebSocket API for real-time conversion updates.

**Tech Stack:** Vite 6, React 19, TypeScript 5, shadcn/ui, Tailwind CSS 4, TanStack Query v5, Axios, WebSocket API, Vitest, React Testing Library

---

## Task 1: Initialize Vite + React + TypeScript Project

**Files:**
- Create: `spotease-frontend/` directory
- Create: `spotease-frontend/package.json`
- Create: `spotease-frontend/vite.config.ts`
- Create: `spotease-frontend/tsconfig.json`
- Create: `spotease-frontend/index.html`
- Create: `spotease-frontend/src/main.tsx`
- Create: `spotease-frontend/src/App.tsx`

**Step 1: Create project directory**

Run:
```bash
cd /home/riven/Spotease/.worktrees/spotease-rework
mkdir spotease-frontend
cd spotease-frontend
```

**Step 2: Initialize package.json**

Run:
```bash
npm create vite@latest . -- --template react-ts
```

Expected: Vite project scaffolded with React + TypeScript template

**Step 3: Install dependencies**

Run:
```bash
npm install
```

Expected: Dependencies installed successfully

**Step 4: Verify development server**

Run:
```bash
npm run dev
```

Expected: Development server starts on http://localhost:5173

**Step 5: Stop development server**

Press Ctrl+C

**Step 6: Create .gitignore**

Create: `spotease-frontend/.gitignore`
```
# dependencies
/node_modules

# production
/dist

# local env files
.env.local
.env.development.local
.env.test.local
.env.production.local

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

**Step 7: Commit initial setup**

```bash
git add .
git commit -m "feat: initialize Vite + React + TypeScript project"
```

---

## Task 2: Install and Configure Tailwind CSS

**Files:**
- Create: `spotease-frontend/tailwind.config.js`
- Create: `spotease-frontend/postcss.config.js`
- Create: `spotease-frontend/src/index.css`
- Modify: `spotease-frontend/src/main.tsx`

**Step 1: Install Tailwind CSS dependencies**

Run:
```bash
npm install -D tailwindcss postcss autoprefixer
```

Expected: SUCCESS

**Step 2: Initialize Tailwind configuration**

Run:
```bash
npx tailwindcss init -p
```

Expected: `tailwind.config.js` and `postcss.config.js` created

**Step 3: Configure Tailwind content paths**

Modify: `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 4: Create base CSS with Tailwind directives**

Create: `src/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 5: Import CSS in main.tsx**

Modify: `src/main.tsx`
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Step 6: Test Tailwind is working**

Modify: `src/App.tsx`
```tsx
function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <h1 className="text-4xl font-bold text-blue-600">Spotease</h1>
    </div>
  )
}

export default App
```

**Step 7: Verify Tailwind styles**

Run: `npm run dev`

Visit http://localhost:5173 and verify blue "Spotease" heading is centered

**Step 8: Commit Tailwind setup**

```bash
git add .
git commit -m "feat: configure Tailwind CSS"
```

---

## Task 3: Install shadcn/ui Dependencies

**Files:**
- Modify: `spotease-frontend/package.json`
- Create: `spotease-frontend/components.json`
- Create: `spotease-frontend/src/lib/utils.ts`

**Step 1: Install shadcn/ui dependencies**

Run:
```bash
npm install class-variance-authority clsx tailwind-merge lucide-react
```

Expected: SUCCESS

**Step 2: Install shadcn CLI**

Run:
```bash
npx shadcn@latest init
```

When prompted:
- TypeScript: Yes
- Style: Default
- Base color: Slate
- CSS variables: Yes
- tailwind.config.js: Yes
- Components path: @/components
- Utils path: @/lib/utils
- React Server Components: No
- Import alias: @/*

Expected: shadcn/ui configured with components.json created

**Step 3: Update tsconfig.json for path aliases**

Modify: `tsconfig.json` (add to compilerOptions)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 4: Update vite.config.ts for path aliases**

Modify: `vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

**Step 5: Install @types/node for path resolution**

Run:
```bash
npm install -D @types/node
```

Expected: SUCCESS

**Step 6: Verify configuration**

Run: `npm run build`

Expected: BUILD SUCCESS

**Step 7: Commit shadcn/ui setup**

```bash
git add .
git commit -m "feat: configure shadcn/ui with path aliases"
```

---

## Task 4: Install Core shadcn/ui Components

**Files:**
- Create: `spotease-frontend/src/components/ui/button.tsx`
- Create: `spotease-frontend/src/components/ui/card.tsx`
- Create: `spotease-frontend/src/components/ui/dialog.tsx`
- Create: `spotease-frontend/src/components/ui/input.tsx`
- Create: `spotease-frontend/src/components/ui/toast.tsx`
- Create: `spotease-frontend/src/components/ui/toaster.tsx`

**Step 1: Add Button component**

Run:
```bash
npx shadcn@latest add button
```

Expected: Button component added to `src/components/ui/button.tsx`

**Step 2: Add Card component**

Run:
```bash
npx shadcn@latest add card
```

Expected: Card component added

**Step 3: Add Dialog component**

Run:
```bash
npx shadcn@latest add dialog
```

Expected: Dialog component added

**Step 4: Add Input component**

Run:
```bash
npx shadcn@latest add input
```

Expected: Input component added

**Step 5: Add Toast components**

Run:
```bash
npx shadcn@latest add toast
```

Expected: Toast and Toaster components added

**Step 6: Add Progress component**

Run:
```bash
npx shadcn@latest add progress
```

Expected: Progress component added

**Step 7: Add Skeleton component**

Run:
```bash
npx shadcn@latest add skeleton
```

Expected: Skeleton component added

**Step 8: Commit shadcn/ui components**

```bash
git add .
git commit -m "feat: add shadcn/ui components (button, card, dialog, input, toast, progress, skeleton)"
```

---

## Task 5: Set Up Axios API Client

**Files:**
- Create: `spotease-frontend/src/api/client.ts`
- Create: `spotease-frontend/src/api/auth.ts`
- Create: `spotease-frontend/.env.development`

**Step 1: Install Axios**

Run:
```bash
npm install axios
```

Expected: SUCCESS

**Step 2: Create environment configuration**

Create: `.env.development`
```
VITE_API_BASE_URL=http://localhost:8080
```

**Step 3: Create Axios instance**

Create: `src/api/client.ts`
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - could clear auth state here
      console.error('Unauthorized request');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**Step 4: Create auth API endpoints**

Create: `src/api/auth.ts`
```typescript
import apiClient from './client';

export interface AuthStatus {
  authenticated: boolean;
  userId?: number;
  spotifyConnected: boolean;
  neteaseConnected: boolean;
}

export interface SpotifyLoginResponse {
  authUrl: string;
}

export interface NeteaseQRResponse {
  message: string;
  qrKey: string;
  qrImage: string;
}

export interface NeteaseQRStatusResponse {
  status: string;
  message: string;
}

export const authApi = {
  // Get current auth status
  getStatus: async (): Promise<AuthStatus> => {
    const response = await apiClient.get<AuthStatus>('/api/auth/status');
    return response.data;
  },

  // Get Spotify OAuth URL
  getSpotifyLoginUrl: async (): Promise<SpotifyLoginResponse> => {
    const response = await apiClient.get<SpotifyLoginResponse>('/api/auth/spotify/login');
    return response.data;
  },

  // Generate NetEase QR code
  generateNeteaseQR: async (): Promise<NeteaseQRResponse> => {
    const response = await apiClient.post<NeteaseQRResponse>('/api/auth/netease/qr');
    return response.data;
  },

  // Check NetEase QR status
  checkNeteaseQRStatus: async (key: string): Promise<NeteaseQRStatusResponse> => {
    const response = await apiClient.get<NeteaseQRStatusResponse>(
      `/api/auth/netease/qr/status?key=${key}`
    );
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/logout');
  },
};
```

**Step 5: Add .env files to .gitignore**

Modify: `.gitignore` (add if not already present)
```
.env.local
.env.development.local
.env.test.local
.env.production.local
```

**Step 6: Commit API client setup**

```bash
git add .
git commit -m "feat: configure Axios API client with auth endpoints"
```

---

## Task 6: Install and Configure TanStack Query

**Files:**
- Create: `spotease-frontend/src/lib/queryClient.ts`
- Modify: `spotease-frontend/src/main.tsx`

**Step 1: Install TanStack Query**

Run:
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

Expected: SUCCESS

**Step 2: Create Query Client configuration**

Create: `src/lib/queryClient.ts`
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Step 3: Wrap app with QueryClientProvider**

Modify: `src/main.tsx`
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App.tsx'
import './index.css'
import { queryClient } from './lib/queryClient'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
```

**Step 4: Verify Query DevTools**

Run: `npm run dev`

Visit http://localhost:5173 and verify React Query DevTools icon appears

**Step 5: Commit TanStack Query setup**

```bash
git add .
git commit -m "feat: configure TanStack Query with devtools"
```

---

## Task 7: Create Type Definitions

**Files:**
- Create: `spotease-frontend/src/types/auth.ts`
- Create: `spotease-frontend/src/types/playlist.ts`
- Create: `spotease-frontend/src/types/conversion.ts`
- Create: `spotease-frontend/src/types/track.ts`

**Step 1: Create auth types**

Create: `src/types/auth.ts`
```typescript
export interface User {
  id: number;
  email: string;
  spotifyUserId?: string;
  neteaseUserId?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  userId?: number;
  email?: string;
  spotifyConnected: boolean;
  neteaseConnected: boolean;
}
```

**Step 2: Create playlist types**

Create: `src/types/playlist.ts`
```typescript
export enum Platform {
  SPOTIFY = 'SPOTIFY',
  NETEASE = 'NETEASE',
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  totalTracks: number;
  platform: Platform;
  imageUrl?: string;
}
```

**Step 3: Create conversion types**

Create: `src/types/conversion.ts`
```typescript
import { Platform } from './playlist';

export enum ConversionMode {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
}

export enum JobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  REVIEW_PENDING = 'REVIEW_PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ConversionJob {
  id: number;
  sourcePlatform: Platform;
  sourcePlaylistId: string;
  sourcePlaylistName: string;
  destinationPlatform: Platform;
  destinationPlaylistId?: string;
  destinationPlaylistName: string;
  mode: ConversionMode;
  status: JobStatus;
  totalTracks: number;
  processedTracks: number;
  highConfidenceMatches: number;
  lowConfidenceMatches: number;
  failedTracks: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateConversionRequest {
  sourcePlatform: Platform;
  sourcePlaylistId: string;
  mode: ConversionMode;
  destinationPlaylistName: string;
  destinationPlaylistId?: string;
}
```

**Step 4: Create track types**

Create: `src/types/track.ts`
```typescript
export enum MatchStatus {
  AUTO_MATCHED = 'AUTO_MATCHED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  USER_APPROVED = 'USER_APPROVED',
  USER_SKIPPED = 'USER_SKIPPED',
  FAILED = 'FAILED',
}

export interface Track {
  id: string;
  name: string;
  artists: string[];
  album?: string;
  duration: number;
  isrc?: string;
}

export interface TrackMatch {
  id: number;
  sourceTrackId: string;
  sourceTrackName: string;
  sourceArtist: string;
  sourceAlbum?: string;
  sourceDuration: number;
  sourceISRC?: string;
  destinationTrackId?: string;
  destinationTrackName?: string;
  destinationArtist?: string;
  matchConfidence: number;
  status: MatchStatus;
  errorMessage?: string;
}

export interface TrackMatchCandidate {
  track: Track;
  confidence: number;
}
```

**Step 5: Commit type definitions**

```bash
git add .
git commit -m "feat: create TypeScript type definitions for auth, playlists, conversions, and tracks"
```

---

## Task 8: Create Auth Context and Hooks

**Files:**
- Create: `spotease-frontend/src/contexts/AuthContext.tsx`
- Create: `spotease-frontend/src/hooks/useAuth.ts`
- Modify: `spotease-frontend/src/main.tsx`

**Step 1: Create Auth Context**

Create: `src/contexts/AuthContext.tsx`
```typescript
import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { AuthStatus } from '@/types/auth';

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

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
```

**Step 2: Create useAuth hook**

Create: `src/hooks/useAuth.ts`
```typescript
import { useAuthContext } from '@/contexts/AuthContext';

export const useAuth = () => {
  return useAuthContext();
};
```

**Step 3: Wrap app with AuthProvider**

Modify: `src/main.tsx`
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App.tsx'
import './index.css'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './contexts/AuthContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
```

**Step 4: Commit Auth Context setup**

```bash
git add .
git commit -m "feat: create Auth Context and useAuth hook"
```

---

## Task 9: Install React Router

**Files:**
- Modify: `spotease-frontend/package.json`
- Create: `spotease-frontend/src/routes.tsx`
- Modify: `spotease-frontend/src/App.tsx`

**Step 1: Install React Router**

Run:
```bash
npm install react-router-dom
```

Expected: SUCCESS

**Step 2: Create routes configuration**

Create: `src/routes.tsx`
```typescript
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
```

**Step 3: Update App.tsx to use router**

Modify: `src/App.tsx`
```tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
```

**Step 4: Create placeholder pages**

Create: `src/pages/Landing.tsx`
```tsx
const Landing = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <h1 className="text-4xl font-bold">Landing Page</h1>
    </div>
  );
};

export default Landing;
```

Create: `src/pages/Dashboard.tsx`
```tsx
const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-4xl font-bold">Dashboard</h1>
    </div>
  );
};

export default Dashboard;
```

Create: `src/pages/NewConversion.tsx`
```tsx
const NewConversion = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-4xl font-bold">New Conversion</h1>
    </div>
  );
};

export default NewConversion;
```

Create: `src/pages/ReviewMatches.tsx`
```tsx
const ReviewMatches = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-4xl font-bold">Review Matches</h1>
    </div>
  );
};

export default ReviewMatches;
```

**Step 5: Verify routing works**

Run: `npm run dev`

Visit http://localhost:5173 and verify Landing page shows

**Step 6: Commit router setup**

```bash
git add .
git commit -m "feat: configure React Router with placeholder pages"
```

---

## Task 10: Create Layout Component

**Files:**
- Create: `spotease-frontend/src/components/layout/Header.tsx`
- Create: `spotease-frontend/src/components/layout/Layout.tsx`

**Step 1: Create Header component**

Create: `src/components/layout/Header.tsx`
```tsx
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { authStatus, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1
              className="text-2xl font-bold text-blue-600 cursor-pointer"
              onClick={() => navigate(authStatus?.authenticated ? '/dashboard' : '/')}
            >
              Spotease
            </h1>
          </div>

          {authStatus?.authenticated && (
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {authStatus.email}
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
```

**Step 2: Create Layout component**

Create: `src/components/layout/Layout.tsx`
```tsx
import { ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>{children}</main>
    </div>
  );
};

export default Layout;
```

**Step 3: Commit layout components**

```bash
git add .
git commit -m "feat: create Header and Layout components"
```

---

## Task 11: Create Spotify Login Button Component

**Files:**
- Create: `spotease-frontend/src/components/auth/SpotifyLoginButton.tsx`

**Step 1: Create SpotifyLoginButton component**

Create: `src/components/auth/SpotifyLoginButton.tsx`
```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/api/auth';
import { useToast } from '@/hooks/use-toast';

const SpotifyLoginButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSpotifyLogin = async () => {
    try {
      setIsLoading(true);
      const response = await authApi.getSpotifyLoginUrl();

      // Redirect to Spotify OAuth
      window.location.href = response.authUrl;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initiate Spotify login',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSpotifyLogin}
      disabled={isLoading}
      className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
    >
      {isLoading ? 'Connecting...' : 'Connect Spotify'}
    </Button>
  );
};

export default SpotifyLoginButton;
```

**Step 2: Commit Spotify login button**

```bash
git add .
git commit -m "feat: create Spotify login button component"
```

---

## Task 12: Create NetEase QR Login Modal Component

**Files:**
- Create: `spotease-frontend/src/components/auth/NeteaseQRModal.tsx`

**Step 1: Create NeteaseQRModal component**

Create: `src/components/auth/NeteaseQRModal.tsx`
```tsx
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { authApi } from '@/api/auth';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface NeteaseQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NeteaseQRModal = ({ open, onOpenChange }: NeteaseQRModalProps) => {
  const [qrImage, setQrImage] = useState<string>('');
  const [qrKey, setQrKey] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'scanning' | 'success' | 'error'>('loading');
  const { toast } = useToast();
  const { refetchAuth } = useAuth();

  useEffect(() => {
    if (open) {
      generateQR();
    }
  }, [open]);

  useEffect(() => {
    if (qrKey && status === 'ready') {
      const interval = setInterval(async () => {
        try {
          const response = await authApi.checkNeteaseQRStatus(qrKey);

          if (response.status === 'SUCCESS') {
            setStatus('success');
            clearInterval(interval);
            toast({
              title: 'Success',
              description: 'NetEase Music connected successfully',
            });
            refetchAuth();
            setTimeout(() => onOpenChange(false), 1500);
          } else if (response.status === 'SCANNING') {
            setStatus('scanning');
          }
        } catch (error) {
          console.error('Error checking QR status:', error);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [qrKey, status]);

  const generateQR = async () => {
    try {
      setStatus('loading');
      const response = await authApi.generateNeteaseQR();
      setQrImage(response.qrImage);
      setQrKey(response.qrKey);
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect NetEase Music</DialogTitle>
          <DialogDescription>
            Scan the QR code with your NetEase Music mobile app
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {status === 'loading' && (
            <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
              <p className="text-gray-500">Generating QR code...</p>
            </div>
          )}

          {status === 'ready' && qrImage && (
            <>
              <img src={qrImage} alt="NetEase QR Code" className="w-64 h-64" />
              <p className="text-sm text-gray-600">Waiting for scan...</p>
            </>
          )}

          {status === 'scanning' && qrImage && (
            <>
              <img src={qrImage} alt="NetEase QR Code" className="w-64 h-64" />
              <p className="text-sm text-green-600 font-medium">QR code scanned! Waiting for confirmation...</p>
            </>
          )}

          {status === 'success' && (
            <div className="w-64 h-64 flex items-center justify-center bg-green-50 rounded">
              <p className="text-green-600 font-medium">✓ Connected successfully!</p>
            </div>
          )}

          {status === 'error' && (
            <div className="w-64 h-64 flex flex-col items-center justify-center gap-4">
              <p className="text-red-600">Failed to generate QR code</p>
              <Button onClick={generateQR}>Try Again</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NeteaseQRModal;
```

**Step 2: Commit NetEase QR modal**

```bash
git add .
git commit -m "feat: create NetEase QR login modal with polling"
```

---

## Task 13: Build Landing Page with Auth Flow

**Files:**
- Modify: `spotease-frontend/src/pages/Landing.tsx`

**Step 1: Implement Landing page**

Modify: `src/pages/Landing.tsx`
```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import SpotifyLoginButton from '@/components/auth/SpotifyLoginButton';
import NeteaseQRModal from '@/components/auth/NeteaseQRModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Landing = () => {
  const { authStatus, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showNeteaseModal, setShowNeteaseModal] = useState(false);

  useEffect(() => {
    // Redirect to dashboard if both platforms are connected
    if (authStatus?.spotifyConnected && authStatus?.neteaseConnected) {
      navigate('/dashboard');
    }
  }, [authStatus, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            Spotease
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Convert playlists between Spotify and NetEase Music
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Spotify Card */}
            <Card className={authStatus?.spotifyConnected ? 'border-green-500 bg-green-50' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Spotify
                  {authStatus?.spotifyConnected && (
                    <span className="text-green-600 text-sm">✓ Connected</span>
                  )}
                </CardTitle>
                <CardDescription>
                  Connect your Spotify account to start converting playlists
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!authStatus?.spotifyConnected ? (
                  <SpotifyLoginButton />
                ) : (
                  <Button disabled className="w-full">
                    Connected
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* NetEase Card */}
            <Card className={authStatus?.neteaseConnected ? 'border-green-500 bg-green-50' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  NetEase Music
                  {authStatus?.neteaseConnected && (
                    <span className="text-green-600 text-sm">✓ Connected</span>
                  )}
                </CardTitle>
                <CardDescription>
                  Scan QR code with your NetEase Music mobile app
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!authStatus?.neteaseConnected ? (
                  <Button
                    onClick={() => setShowNeteaseModal(true)}
                    disabled={!authStatus?.spotifyConnected}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    Connect NetEase
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    Connected
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {authStatus?.spotifyConnected && !authStatus?.neteaseConnected && (
            <p className="mt-8 text-sm text-gray-600">
              Connect NetEase Music to continue
            </p>
          )}

          {authStatus?.spotifyConnected && authStatus?.neteaseConnected && (
            <div className="mt-8">
              <Button
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="px-8"
              >
                Go to Dashboard →
              </Button>
            </div>
          )}
        </div>
      </div>

      <NeteaseQRModal
        open={showNeteaseModal}
        onOpenChange={setShowNeteaseModal}
      />
    </div>
  );
};

export default Landing;
```

**Step 2: Test landing page**

Run: `npm run dev`

Visit http://localhost:5173 and verify:
- Spotify and NetEase cards are displayed
- Spotify login button is present
- NetEase button is disabled until Spotify is connected

**Step 3: Commit Landing page**

```bash
git add .
git commit -m "feat: build Landing page with authentication flow"
```

---

## Task 14: Create Playlist API Endpoints

**Files:**
- Create: `spotease-frontend/src/api/playlists.ts`

**Step 1: Create playlist API endpoints**

Create: `src/api/playlists.ts`
```typescript
import apiClient from './client';
import { Playlist, Platform } from '@/types/playlist';

export const playlistsApi = {
  // Get Spotify playlists
  getSpotifyPlaylists: async (): Promise<Playlist[]> => {
    const response = await apiClient.get<Playlist[]>('/api/playlists/spotify');
    return response.data;
  },

  // Get NetEase playlists
  getNeteasePlaylists: async (): Promise<Playlist[]> => {
    const response = await apiClient.get<Playlist[]>('/api/playlists/netease');
    return response.data;
  },

  // Get single playlist details
  getPlaylistDetails: async (platform: Platform, playlistId: string): Promise<Playlist> => {
    const platformPath = platform.toLowerCase();
    const response = await apiClient.get<Playlist>(`/api/playlists/${platformPath}/${playlistId}`);
    return response.data;
  },
};
```

**Step 2: Commit playlist API**

```bash
git add .
git commit -m "feat: create playlist API endpoints"
```

---

## Task 15: Create Conversion API Endpoints

**Files:**
- Create: `spotease-frontend/src/api/conversions.ts`

**Step 1: Create conversion API endpoints**

Create: `src/api/conversions.ts`
```typescript
import apiClient from './client';
import { ConversionJob, CreateConversionRequest } from '@/types/conversion';
import { TrackMatch } from '@/types/track';

export const conversionsApi = {
  // Create new conversion job
  createConversion: async (request: CreateConversionRequest): Promise<ConversionJob> => {
    const response = await apiClient.post<ConversionJob>('/api/conversions', request);
    return response.data;
  },

  // Get all user's conversion jobs
  getConversions: async (): Promise<ConversionJob[]> => {
    const response = await apiClient.get<ConversionJob[]>('/api/conversions');
    return response.data;
  },

  // Get single conversion job details
  getConversion: async (jobId: number): Promise<ConversionJob> => {
    const response = await apiClient.get<ConversionJob>(`/api/conversions/${jobId}`);
    return response.data;
  },

  // Delete conversion job
  deleteConversion: async (jobId: number): Promise<void> => {
    await apiClient.delete(`/api/conversions/${jobId}`);
  },

  // Get pending matches for review
  getPendingMatches: async (jobId: number): Promise<TrackMatch[]> => {
    const response = await apiClient.get<TrackMatch[]>(
      `/api/conversions/${jobId}/pending-matches`
    );
    return response.data;
  },

  // Approve a match
  approveMatch: async (jobId: number, matchId: number): Promise<void> => {
    await apiClient.post(`/api/conversions/${jobId}/matches/${matchId}/approve`);
  },

  // Skip a match
  skipMatch: async (jobId: number, matchId: number): Promise<void> => {
    await apiClient.post(`/api/conversions/${jobId}/matches/${matchId}/skip`);
  },

  // Search for alternative matches
  searchAlternatives: async (jobId: number, matchId: number, query: string): Promise<TrackMatch[]> => {
    const response = await apiClient.post<TrackMatch[]>(
      `/api/conversions/${jobId}/matches/${matchId}/search`,
      { query }
    );
    return response.data;
  },
};
```

**Step 2: Commit conversion API**

```bash
git add .
git commit -m "feat: create conversion API endpoints"
```

---

## Task 16: Create WebSocket Hook

**Files:**
- Create: `spotease-frontend/src/hooks/useWebSocket.ts`

**Step 1: Create WebSocket hook**

Create: `src/hooks/useWebSocket.ts`
```typescript
import { useEffect, useRef, useState } from 'react';
import { ConversionJob } from '@/types/conversion';

interface UseWebSocketOptions {
  onJobUpdate?: (job: ConversionJob) => void;
  enabled?: boolean;
}

export const useWebSocket = ({ onJobUpdate, enabled = true }: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/conversions';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const job: ConversionJob = JSON.parse(event.data);
        onJobUpdate?.(job);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [enabled, onJobUpdate]);

  return { isConnected };
};
```

**Step 2: Add WebSocket URL to environment**

Modify: `.env.development`
```
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws/conversions
```

**Step 3: Commit WebSocket hook**

```bash
git add .
git commit -m "feat: create WebSocket hook for real-time updates"
```

---

## Task 17: Create Playlist Card Component

**Files:**
- Create: `spotease-frontend/src/components/playlists/PlaylistCard.tsx`

**Step 1: Create PlaylistCard component**

Create: `src/components/playlists/PlaylistCard.tsx`
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Playlist } from '@/types/playlist';
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
```

**Step 2: Commit PlaylistCard component**

```bash
git add .
git commit -m "feat: create PlaylistCard component"
```

---

## Task 18: Create Playlist Grid Component

**Files:**
- Create: `spotease-frontend/src/components/playlists/PlaylistGrid.tsx`

**Step 1: Create PlaylistGrid component**

Create: `src/components/playlists/PlaylistGrid.tsx`
```tsx
import { Playlist } from '@/types/playlist';
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
```

**Step 2: Commit PlaylistGrid component**

```bash
git add .
git commit -m "feat: create PlaylistGrid component with loading states"
```

---

## Task 19: Create Conversion Job Card Component

**Files:**
- Create: `spotease-frontend/src/components/conversions/ConversionJobCard.tsx`

**Step 1: Create ConversionJobCard component**

Create: `src/components/conversions/ConversionJobCard.tsx`
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ConversionJob, JobStatus } from '@/types/conversion';
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
```

**Step 2: Commit ConversionJobCard component**

```bash
git add .
git commit -m "feat: create ConversionJobCard component with progress tracking"
```

---

## Task 20: Build Dashboard Page

**Files:**
- Modify: `spotease-frontend/src/pages/Dashboard.tsx`

**Step 1: Implement Dashboard page**

Modify: `src/pages/Dashboard.tsx`
```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { conversionsApi } from '@/api/conversions';
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
      queryClient.setQueryData(['conversions'], (oldJobs: any) => {
        if (!oldJobs) return [updatedJob];
        return oldJobs.map((job: any) =>
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
```

**Step 2: Test dashboard**

Run: `npm run dev`

Navigate to /dashboard and verify layout

**Step 3: Commit Dashboard page**

```bash
git add .
git commit -m "feat: build Dashboard page with real-time WebSocket updates"
```

---

## Task 21: Build New Conversion Page

**Files:**
- Modify: `spotease-frontend/src/pages/NewConversion.tsx`

**Step 1: Implement NewConversion page**

Modify: `src/pages/NewConversion.tsx`
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { playlistsApi } from '@/api/playlists';
import { conversionsApi } from '@/api/conversions';
import Layout from '@/components/layout/Layout';
import PlaylistGrid from '@/components/playlists/PlaylistGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Platform, Playlist } from '@/types/playlist';
import { ConversionMode } from '@/types/conversion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const NewConversion = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sourcePlatform, setSourcePlatform] = useState<Platform | null>(null);
  const [sourcePlaylist, setSourcePlaylist] = useState<Playlist | null>(null);
  const [conversionMode, setConversionMode] = useState<ConversionMode>(ConversionMode.CREATE);
  const [destinationPlaylistName, setDestinationPlaylistName] = useState('');
  const [destinationPlaylist, setDestinationPlaylist] = useState<Playlist | null>(null);

  // Fetch playlists based on selected source platform
  const { data: spotifyPlaylists, isLoading: spotifyLoading } = useQuery({
    queryKey: ['playlists', 'spotify'],
    queryFn: playlistsApi.getSpotifyPlaylists,
    enabled: sourcePlatform === Platform.SPOTIFY,
  });

  const { data: neteasePlaylists, isLoading: neteaseLoading } = useQuery({
    queryKey: ['playlists', 'netease'],
    queryFn: playlistsApi.getNeteasePlaylists,
    enabled: sourcePlatform === Platform.NETEASE,
  });

  // Fetch destination playlists for UPDATE mode
  const destinationPlatform = sourcePlatform === Platform.SPOTIFY ? Platform.NETEASE : Platform.SPOTIFY;

  const { data: destinationPlaylists, isLoading: destinationLoading } = useQuery({
    queryKey: ['playlists', destinationPlatform?.toLowerCase()],
    queryFn: destinationPlatform === Platform.SPOTIFY
      ? playlistsApi.getSpotifyPlaylists
      : playlistsApi.getNeteasePlaylists,
    enabled: step === 3 && conversionMode === ConversionMode.UPDATE,
  });

  // Create conversion mutation
  const createConversionMutation = useMutation({
    mutationFn: conversionsApi.createConversion,
    onSuccess: (job) => {
      toast({
        title: 'Conversion started',
        description: 'Your playlist conversion is now in progress',
      });
      navigate('/dashboard');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to start conversion',
        variant: 'destructive',
      });
    },
  });

  const handlePlatformSelect = (platform: Platform) => {
    setSourcePlatform(platform);
    setStep(2);
  };

  const handlePlaylistSelect = (playlist: Playlist) => {
    setSourcePlaylist(playlist);
  };

  const handleNextFromPlaylistSelect = () => {
    if (!sourcePlaylist) return;
    setDestinationPlaylistName(`${sourcePlaylist.name} (Converted)`);
    setStep(3);
  };

  const handleStartConversion = () => {
    if (!sourcePlaylist || !sourcePlatform) return;

    const request = {
      sourcePlatform,
      sourcePlaylistId: sourcePlaylist.id,
      mode: conversionMode,
      destinationPlaylistName:
        conversionMode === ConversionMode.CREATE
          ? destinationPlaylistName
          : destinationPlaylist!.name,
      destinationPlaylistId:
        conversionMode === ConversionMode.UPDATE
          ? destinationPlaylist!.id
          : undefined,
    };

    createConversionMutation.mutate(request);
  };

  const canProceedToFinal =
    (conversionMode === ConversionMode.CREATE && destinationPlaylistName.trim().length > 0) ||
    (conversionMode === ConversionMode.UPDATE && destinationPlaylist !== null);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">New Conversion</h1>
          <p className="text-gray-600 mt-1">
            Step {step} of 3
          </p>
        </div>

        {/* Step 1: Select Source Platform */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Select Source Platform</CardTitle>
                <CardDescription>
                  Choose where you want to convert from
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-32 text-lg"
                  onClick={() => handlePlatformSelect(Platform.SPOTIFY)}
                >
                  Spotify
                </Button>
                <Button
                  variant="outline"
                  className="h-32 text-lg"
                  onClick={() => handlePlatformSelect(Platform.NETEASE)}
                >
                  NetEase Music
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Select Source Playlist */}
        {step === 2 && sourcePlatform && (
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Playlist from {sourcePlatform}</CardTitle>
                <CardDescription>
                  Choose the playlist you want to convert
                </CardDescription>
              </CardHeader>
            </Card>

            <PlaylistGrid
              playlists={sourcePlatform === Platform.SPOTIFY ? spotifyPlaylists || [] : neteasePlaylists || []}
              isLoading={sourcePlatform === Platform.SPOTIFY ? spotifyLoading : neteaseLoading}
              onPlaylistClick={handlePlaylistSelect}
              selectedPlaylistId={sourcePlaylist?.id}
            />

            {sourcePlaylist && (
              <div className="mt-6 flex justify-end">
                <Button onClick={handleNextFromPlaylistSelect} size="lg">
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Configure Destination */}
        {step === 3 && sourcePlaylist && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Mode</CardTitle>
                <CardDescription>
                  Choose how you want to convert
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    conversionMode === ConversionMode.CREATE
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                  onClick={() => {
                    setConversionMode(ConversionMode.CREATE);
                    setDestinationPlaylist(null);
                  }}
                >
                  <h3 className="font-semibold">Create New Playlist</h3>
                  <p className="text-sm text-gray-600">
                    Create a new playlist on {destinationPlatform}
                  </p>
                </div>

                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    conversionMode === ConversionMode.UPDATE
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                  onClick={() => {
                    setConversionMode(ConversionMode.UPDATE);
                  }}
                >
                  <h3 className="font-semibold">Update Existing Playlist</h3>
                  <p className="text-sm text-gray-600">
                    Add missing tracks to an existing playlist
                  </p>
                </div>
              </CardContent>
            </Card>

            {conversionMode === ConversionMode.CREATE && (
              <Card>
                <CardHeader>
                  <CardTitle>Destination Playlist Name</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={destinationPlaylistName}
                    onChange={(e) => setDestinationPlaylistName(e.target.value)}
                    placeholder="Enter playlist name"
                  />
                </CardContent>
              </Card>
            )}

            {conversionMode === ConversionMode.UPDATE && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Destination Playlist</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlaylistGrid
                    playlists={destinationPlaylists || []}
                    isLoading={destinationLoading}
                    onPlaylistClick={setDestinationPlaylist}
                    selectedPlaylistId={destinationPlaylist?.id}
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                onClick={handleStartConversion}
                disabled={!canProceedToFinal || createConversionMutation.isPending}
                size="lg"
              >
                {createConversionMutation.isPending ? 'Starting...' : 'Start Conversion'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NewConversion;
```

**Step 2: Test new conversion flow**

Run: `npm run dev`

Navigate to /conversion/new and verify step-by-step flow

**Step 3: Commit NewConversion page**

```bash
git add .
git commit -m "feat: build New Conversion page with multi-step flow"
```

---

## Task 22: Create Track Match Card Component

**Files:**
- Create: `spotease-frontend/src/components/conversions/TrackMatchCard.tsx`

**Step 1: Create TrackMatchCard component**

Create: `src/components/conversions/TrackMatchCard.tsx`
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrackMatch } from '@/types/track';
import { Music, Check, X } from 'lucide-react';

interface TrackMatchCardProps {
  match: TrackMatch;
  onApprove: () => void;
  onSkip: () => void;
  isProcessing?: boolean;
}

const TrackMatchCard = ({ match, onApprove, onSkip, isProcessing = false }: TrackMatchCardProps) => {
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
            <div className="w-12 h-12 bg-blue-200 rounded flex items-center justify-center flex-shrink-0">
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
              <div className="w-12 h-12 bg-green-200 rounded flex items-center justify-center flex-shrink-0">
                <Music className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{match.destinationTrackName}</p>
                <p className="text-sm text-gray-600">{match.destinationArtist}</p>
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
```

**Step 2: Commit TrackMatchCard component**

```bash
git add .
git commit -m "feat: create TrackMatchCard component for review interface"
```

---

## Task 23: Build Review Matches Page

**Files:**
- Modify: `spotease-frontend/src/pages/ReviewMatches.tsx`

**Step 1: Implement ReviewMatches page**

Modify: `src/pages/ReviewMatches.tsx`
```tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversionsApi } from '@/api/conversions';
import Layout from '@/components/layout/Layout';
import TrackMatchCard from '@/components/conversions/TrackMatchCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { TrackMatch } from '@/types/track';

const ReviewMatches = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch pending matches
  const { data: matches, isLoading } = useQuery({
    queryKey: ['pendingMatches', jobId],
    queryFn: () => conversionsApi.getPendingMatches(Number(jobId)),
    enabled: !!jobId,
  });

  const currentMatch = matches?.[currentIndex];

  // Approve match mutation
  const approveMutation = useMutation({
    mutationFn: ({ jobId, matchId }: { jobId: number; matchId: number }) =>
      conversionsApi.approveMatch(jobId, matchId),
    onSuccess: () => {
      toast({
        title: 'Match approved',
        description: 'Track added to destination playlist',
      });
      moveToNext();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to approve match',
        variant: 'destructive',
      });
    },
  });

  // Skip match mutation
  const skipMutation = useMutation({
    mutationFn: ({ jobId, matchId }: { jobId: number; matchId: number }) =>
      conversionsApi.skipMatch(jobId, matchId),
    onSuccess: () => {
      toast({
        title: 'Match skipped',
        description: 'Track will not be added to destination playlist',
      });
      moveToNext();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to skip match',
        variant: 'destructive',
      });
    },
  });

  const moveToNext = () => {
    if (matches && currentIndex < matches.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All matches reviewed
      queryClient.invalidateQueries({ queryKey: ['conversions'] });
      toast({
        title: 'Review complete',
        description: 'All matches have been reviewed',
      });
      navigate('/dashboard');
    }
  };

  const handleApprove = () => {
    if (!currentMatch || !jobId) return;
    approveMutation.mutate({ jobId: Number(jobId), matchId: currentMatch.id });
  };

  const handleSkip = () => {
    if (!currentMatch || !jobId) return;
    skipMutation.mutate({ jobId: Number(jobId), matchId: currentMatch.id });
  };

  const isProcessing = approveMutation.isPending || skipMutation.isPending;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-600">Loading matches...</p>
        </div>
      </Layout>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">No matches to review</h2>
          <p className="text-gray-600 mb-8">All tracks have been processed</p>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Review Matches</h1>
          <p className="text-gray-600 mt-1">
            Review {currentIndex + 1} of {matches.length}
          </p>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / matches.length) * 100}%` }}
            />
          </div>
        </div>

        {currentMatch && (
          <TrackMatchCard
            match={currentMatch}
            onApprove={handleApprove}
            onSkip={handleSkip}
            isProcessing={isProcessing}
          />
        )}
      </div>
    </Layout>
  );
};

export default ReviewMatches;
```

**Step 2: Test review flow**

Run: `npm run dev`

Navigate to /conversion/1/review (will show "No matches" without backend)

**Step 3: Commit ReviewMatches page**

```bash
git add .
git commit -m "feat: build Review Matches page with card-based interface"
```

---

## Task 24: Create README for Frontend

**Files:**
- Create: `spotease-frontend/README.md`

**Step 1: Create README**

Create: `README.md`
```markdown
# Spotease Frontend

React frontend for Spotease - Spotify and NetEase Music playlist converter.

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 6
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Routing**: React Router v6
- **State Management**: TanStack Query v5
- **HTTP Client**: Axios
- **Real-time Updates**: WebSocket API

## Prerequisites

- Node.js 18+
- npm 9+
- Backend server running on http://localhost:8080

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**

Create `.env.development` file:
```
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws/conversions
```

3. **Run development server:**
```bash
npm run dev
```

Application will start on http://localhost:5173

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── api/                 # API client and endpoints
│   ├── client.ts       # Axios configuration
│   ├── auth.ts         # Auth API endpoints
│   ├── playlists.ts    # Playlist API endpoints
│   └── conversions.ts  # Conversion API endpoints
├── components/         # React components
│   ├── ui/            # shadcn/ui components
│   ├── auth/          # Auth-related components
│   ├── layout/        # Layout components
│   ├── playlists/     # Playlist components
│   └── conversions/   # Conversion components
├── contexts/          # React contexts
│   └── AuthContext.tsx
├── hooks/             # Custom React hooks
│   ├── useAuth.ts
│   └── useWebSocket.ts
├── lib/               # Utility libraries
│   ├── queryClient.ts
│   └── utils.ts
├── pages/             # Page components
│   ├── Landing.tsx
│   ├── Dashboard.tsx
│   ├── NewConversion.tsx
│   └── ReviewMatches.tsx
├── types/             # TypeScript type definitions
│   ├── auth.ts
│   ├── playlist.ts
│   ├── conversion.ts
│   └── track.ts
├── routes.tsx         # Router configuration
├── App.tsx            # Root component
└── main.tsx           # Application entry point
```

## Features

### Authentication
- Spotify OAuth login
- NetEase Music QR code authentication
- Session management with cookies

### Playlist Management
- Browse Spotify playlists
- Browse NetEase Music playlists
- Select playlists for conversion

### Conversion
- Create new playlists on destination platform
- Update existing playlists (additive merge)
- Real-time progress tracking via WebSocket
- Automatic track matching with confidence scoring

### Review Interface
- Card-based review for uncertain matches
- Approve or skip individual tracks
- Progress tracking during review

## API Integration

The frontend communicates with the Spring Boot backend via:

- **REST API**: All CRUD operations
- **WebSocket**: Real-time conversion job updates

### API Endpoints Used

- `GET /api/auth/status` - Check authentication status
- `GET /api/auth/spotify/login` - Get Spotify OAuth URL
- `POST /api/auth/netease/qr` - Generate NetEase QR code
- `GET /api/auth/netease/qr/status` - Poll QR status
- `POST /api/auth/logout` - Logout
- `GET /api/playlists/spotify` - Get Spotify playlists
- `GET /api/playlists/netease` - Get NetEase playlists
- `POST /api/conversions` - Create conversion job
- `GET /api/conversions` - Get all conversion jobs
- `GET /api/conversions/:id/pending-matches` - Get matches needing review
- `POST /api/conversions/:id/matches/:matchId/approve` - Approve match
- `POST /api/conversions/:id/matches/:matchId/skip` - Skip match

## Development Notes

- Backend must be running on port 8080
- WebSocket connection established automatically when authenticated
- TanStack Query handles caching and refetching
- shadcn/ui components can be customized in `components/ui/`
- Path alias `@/*` maps to `src/*`

## Building for Production

```bash
npm run build
```

Output will be in `dist/` directory.

## Deployment

The frontend can be deployed to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

Make sure to set environment variables for production:
- `VITE_API_BASE_URL` - Production backend URL
- `VITE_WS_URL` - Production WebSocket URL

## License

MIT
```

**Step 2: Commit README**

```bash
git add README.md
git commit -m "docs: add frontend README with setup instructions"
```

---

## Task 25: Final Verification and Testing

**Files:**
- None (verification task)

**Step 1: Build the application**

Run:
```bash
npm run build
```

Expected: BUILD SUCCESS with no errors

**Step 2: Check for TypeScript errors**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Run development server**

Run:
```bash
npm run dev
```

Expected: Server starts on http://localhost:5173

**Step 4: Verify all routes**

Visit in browser:
- http://localhost:5173/ - Landing page
- http://localhost:5173/dashboard - Dashboard page
- http://localhost:5173/conversion/new - New conversion page
- http://localhost:5173/conversion/1/review - Review page

All pages should load without errors

**Step 5: Check browser console**

Open browser DevTools and verify:
- No console errors
- React Query DevTools appear in bottom corner
- WebSocket connection attempt visible (will fail without backend)

**Step 6: Final commit if fixes needed**

If any fixes were needed:
```bash
git add .
git commit -m "fix: resolve issues found in final verification"
```

---

## Completion Checklist

- [ ] Vite + React + TypeScript project initialized
- [ ] Tailwind CSS configured
- [ ] shadcn/ui installed and components added
- [ ] Axios API client configured
- [ ] TanStack Query setup with DevTools
- [ ] Type definitions created
- [ ] Auth Context and hooks created
- [ ] React Router configured
- [ ] Layout components built
- [ ] Authentication components (Spotify, NetEase QR) created
- [ ] Landing page with auth flow complete
- [ ] Playlist API endpoints created
- [ ] Conversion API endpoints created
- [ ] WebSocket hook implemented
- [ ] Playlist components (Card, Grid) built
- [ ] Conversion components (JobCard, MatchCard) built
- [ ] Dashboard page with real-time updates complete
- [ ] New Conversion page with multi-step flow complete
- [ ] Review Matches page with card interface complete
- [ ] README documentation complete
- [ ] No TypeScript errors
- [ ] Production build successful

**Total Tasks:** 25

---

## Next Steps

After completing this plan:

1. **Backend Integration** - Start backend server and test full flow
2. **Error Handling** - Add comprehensive error boundaries and fallbacks
3. **Loading States** - Enhance loading and skeleton states
4. **Responsive Design** - Test and improve mobile responsiveness
5. **Accessibility** - Add ARIA labels and keyboard navigation
6. **Testing** - Add unit tests with Vitest and React Testing Library
7. **Performance** - Optimize bundle size and implement code splitting
8. **Polish** - Add animations, transitions, and micro-interactions

**Plan saved to:** `docs/plans/2025-12-28-react-frontend-foundation.md`
