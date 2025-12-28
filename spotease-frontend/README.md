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
