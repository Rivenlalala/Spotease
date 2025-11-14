# CLAUDE.md - Spotease Codebase Guide

## Project Overview

**Spotease** is a Next.js application that enables bidirectional playlist conversion between Spotify and NetEase Music platforms. Users can authenticate with both services, link playlists, and sync tracks in real-time.

### Core Functionality
- OAuth authentication for Spotify
- QR code authentication for NetEase Music
- Playlist linking between platforms
- Real-time track synchronization
- Track search and manual pairing
- Automatic track matching between services

## Tech Stack

### Frontend
- **Framework**: Next.js 15.1.6 (App Router)
- **React**: 19.0.0
- **Language**: TypeScript 5.7.3
- **Styling**: Tailwind CSS 3.4.1
- **UI Feedback**: react-hot-toast 2.5.1

### Backend
- **Runtime**: Next.js API Routes
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: NextAuth.js 4.24.11 with custom providers
- **ORM**: Prisma Client 6.2.1

### Development Tools
- **Linting**: ESLint 9 with Next.js config
- **Formatting**: Prettier 3.4.2 with import sorting
- **Type Checking**: TypeScript strict mode
- **Build Tool**: Next.js Turbopack (dev mode)

## Codebase Structure

```
/home/user/Spotease/
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   └── migrations/            # Database migration files
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/              # API route handlers
│   │   ├── dashboard/        # Dashboard page
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page
│   │   └── globals.css       # Global styles
│   ├── components/           # React components
│   ├── lib/                  # Utility libraries
│   ├── scripts/              # Utility scripts
│   └── types/                # TypeScript type definitions
├── eslint.config.mjs         # ESLint configuration
├── next.config.ts            # Next.js configuration
├── postcss.config.mjs        # PostCSS configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies and scripts
```

## Key Directories

### `/src/app/api/` - API Routes

API routes follow Next.js 15 App Router conventions with route handlers:

- **`/auth/`** - Authentication endpoints
  - `spotify/` - Spotify OAuth flow
  - `spotify/callback/` - OAuth callback handler
  - `netease/` - NetEase QR login
  - `netease/profile/` - NetEase profile fetching

- **`/playlists/`** - Playlist management
  - `spotify/` - Fetch Spotify playlists
  - `spotify/[playlistId]/tracks/` - Get tracks from Spotify playlist
  - `netease/` - Fetch NetEase playlists
  - `netease/[playlistId]/tracks/` - Get tracks from NetEase playlist
  - `link/` - Link Spotify and NetEase playlists
  - `linked/` - Get all linked playlist pairs

- **`/tracks/`** - Track operations
  - `search/` - Search for tracks on both platforms
  - `pair/` - Manually pair tracks between platforms

- **`/users/[userId]/`** - User-specific operations

### `/src/components/` - React Components

- **`LinkPlaylistsButton.tsx`** - Button component for linking playlists
- **`LinkedPlaylists.tsx`** - Display linked playlist pairs (6779 bytes)
- **`NeteaseQRLoginModal.tsx`** - QR code login modal for NetEase (6251 bytes)
- **`PlaylistGrid.tsx`** - Grid layout for displaying playlists
- **`PlaylistItem.tsx`** - Individual playlist card component (6487 bytes)
- **`SyncPlaylistsModal.tsx`** - Modal for syncing tracks between playlists (13343 bytes)
- **`TrackSearchModal.tsx`** - Search and pair tracks manually (5832 bytes)

### `/src/lib/` - Utility Libraries

- **`db.ts`** - Prisma client instance (278 bytes)
- **`image.ts`** - Image processing utilities (1378 bytes)
- **`netease.ts`** - NetEase Music API client (4490 bytes)
- **`spotify.ts`** - Spotify API client with token refresh (5168 bytes)

### `/src/types/` - Type Definitions

- **`netease.ts`** - NetEase API response types (1456 bytes)
- **`playlist.ts`** - Playlist-related types (490 bytes)
- **`spotify.ts`** - Spotify API response types (1007 bytes)
- **`track.ts`** - Track-related types (174 bytes)
- **`user.ts`** - User-related types (337 bytes)

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key models:

### User Model
- Stores user profile information
- Manages Spotify OAuth tokens (access, refresh, expiry)
- Stores NetEase session cookie
- Tracks both Spotify and NetEase account associations

### Playlist Model
- Represents playlists from either platform
- Uses `platform` enum (SPOTIFY | NETEASE)
- Self-referencing relation for playlist pairing (`pairedWith`)
- Tracks sync status and last sync time
- Stores track count for optimization

### Track Model
- Represents individual tracks
- Can have both `spotifyId` and `neteaseId`
- Self-referencing relation for track pairing
- Stores artist, album, and track name

### PlaylistTrack Model
- Junction table for many-to-many relationship
- Maintains track position in playlist
- Tracks last sync time per track

## Development Workflows

### Essential Commands

```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint              # Run ESLint
npm run lint:fix          # Auto-fix linting issues
npm run lint:strict       # Fail on warnings

# Formatting
npm run format            # Format with Prettier

# Type checking
npm run check-types       # TypeScript type validation
```

### Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```
   Server runs on http://localhost:3000 with Turbopack for fast refresh

2. **Database Migrations**
   ```bash
   npx prisma migrate dev          # Create and apply migration
   npx prisma generate              # Generate Prisma client
   npx prisma studio                # Open database GUI
   ```

3. **Before Committing**
   ```bash
   npm run check-types              # Ensure no type errors
   npm run lint:fix                 # Fix linting issues
   npm run format                   # Format code
   npm run build                    # Verify production build
   ```

## Coding Conventions

### ESLint Rules (eslint.config.mjs)

**Key Style Guidelines:**
- **Indentation**: 2 spaces (enforced)
- **Quotes**: Double quotes (enforced)
- **Semicolons**: Always required
- **Brace Style**: 1TBS (one true brace style)
- **Trailing Commas**: Required in multiline structures
- **Arrow Functions**: Prefer concise body style (`as-needed`)
- **Variable Declarations**: Use `const` by default, never `var`
- **Template Literals**: Prefer template strings over concatenation
- **Equality**: Always use `===` (strict equality)
- **Default Cases**: Required in switch statements
- **Console**: Only `console.warn` and `console.error` allowed

**Naming Conventions:**
- **Variables/Functions**: camelCase
- **React Components**: PascalCase
- **Types/Interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Files**: Component files use PascalCase, utilities use camelCase

**TypeScript:**
- Strict mode enabled
- Unused variables prefixed with `_` are ignored
- No explicit `any` types without justification

### Import Organization

Prettier with `@trivago/prettier-plugin-sort-imports` handles import sorting:
1. React/Next.js imports
2. Third-party libraries
3. Local imports (using `@/` alias)
4. Type imports (if separated)

### File Organization

**Component Files:**
```typescript
// Imports
import { useState } from "react";
import { SomeType } from "@/types/...";

// Type definitions (if any)
interface ComponentProps {
  // ...
}

// Component definition
export default function Component({ props }: ComponentProps) {
  // State and hooks
  const [state, setState] = useState();

  // Handlers
  const handleEvent = () => {
    // ...
  };

  // Render
  return (
    // JSX
  );
}
```

**API Route Files:**
```typescript
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Logic
    return Response.json(data);
  } catch (error) {
    console.error("Error description:", error);
    return Response.json({ error: "Message" }, { status: 500 });
  }
}
```

## Environment Variables

Required environment variables (defined in next.config.ts):

```bash
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/spotease

# Spotify OAuth
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# NextAuth (implied, not in config)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=random_secret_string
```

**Note**: `.env*` files are gitignored. Create `.env.local` for local development.

## API Client Libraries

### Spotify Client (`src/lib/spotify.ts`)

Key functions:
- Token refresh handling with automatic retry
- Playlist fetching with pagination
- Track retrieval
- User profile fetching

**Important**: Always check token expiry before API calls and refresh if needed.

### NetEase Client (`src/lib/netease.ts`)

Key functions:
- QR code generation for login
- Cookie-based authentication
- Playlist fetching
- Track search
- Track detail retrieval

**Important**: NetEase uses cookie-based auth; cookies must be passed with each request.

## Common Patterns

### 1. Database Queries with Prisma

```typescript
// Always import from centralized client
import { prisma } from "@/lib/db";

// Use transactions for related updates
const result = await prisma.$transaction(async (tx) => {
  const playlist = await tx.playlist.update({...});
  const tracks = await tx.playlistTrack.createMany({...});
  return { playlist, tracks };
});
```

### 2. Error Handling in API Routes

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.requiredField) {
      return Response.json(
        { error: "Missing required field" },
        { status: 400 }
      );
    }

    // Logic
    const result = await doSomething(body);

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error("Descriptive error message:", error);
    return Response.json(
      { error: "User-friendly message" },
      { status: 500 }
    );
  }
}
```

### 3. Component State Management

- Use `useState` for local component state
- Keep related state together in objects when appropriate
- Use `useEffect` for side effects (API calls, subscriptions)
- Memoize expensive calculations with `useMemo`
- Memoize callbacks with `useCallback` when passing to child components

### 4. Type Safety

```typescript
// Define interfaces for all props
interface ComponentProps {
  userId: string;
  onComplete: (result: SomeType) => void;
}

// Use type imports from centralized types
import type { User } from "@/types/user";

// Type API responses
interface APIResponse {
  success: boolean;
  data?: SomeType;
  error?: string;
}
```

## Testing Strategy

**Current State**: No test suite is currently implemented.

**Recommended Approach** (for future implementation):
- Unit tests with Jest for utility functions
- Integration tests for API routes
- E2E tests with Playwright for critical user flows
- Component tests with React Testing Library

## Common Tasks for AI Assistants

### Adding a New API Endpoint

1. Create route handler in `src/app/api/[path]/route.ts`
2. Import necessary dependencies (prisma, types)
3. Implement HTTP method handlers (GET, POST, etc.)
4. Add proper error handling and validation
5. Define response types in `src/types/`
6. Update this CLAUDE.md if it's a new pattern

### Adding a New Component

1. Create component file in `src/components/ComponentName.tsx`
2. Define prop types interface
3. Implement component following existing patterns
4. Ensure proper TypeScript typing
5. Use Tailwind CSS for styling (follow existing patterns)
6. Run `npm run lint:fix` and `npm run format`

### Modifying Database Schema

1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Run `npx prisma generate` to update client
4. Update related TypeScript types in `src/types/`
5. Update affected API routes and components
6. Test migrations locally before committing

### Debugging Common Issues

**Prisma Client Issues**:
```bash
npx prisma generate    # Regenerate client
npx prisma db push     # Sync schema without migration
```

**Type Errors**:
```bash
npm run check-types    # See all type errors
rm -rf .next           # Clear Next.js cache
```

**ESLint Errors**:
```bash
npm run lint:fix       # Auto-fix most issues
```

## Architecture Decisions

### Why App Router?
- Modern Next.js pattern with server components
- Better performance with RSC (React Server Components)
- Simplified data fetching with async components
- Built-in loading and error states

### Why Prisma?
- Type-safe database queries
- Automatic migration management
- Excellent TypeScript integration
- Developer-friendly query API

### Why Bidirectional Sync?
- Users may manage playlists on either platform
- Changes on one platform should reflect on the other
- Manual pairing allows for music availability differences

## Performance Considerations

1. **Database Queries**
   - Use `select` to limit fields when possible
   - Use `include` carefully to avoid over-fetching
   - Consider pagination for large result sets
   - Use indexes on frequently queried fields (already defined in schema)

2. **API Rate Limits**
   - Spotify: ~180 requests per minute
   - NetEase: Rate limits vary by endpoint
   - Implement retry logic with exponential backoff
   - Cache responses when appropriate

3. **Frontend Optimization**
   - Use Next.js Image component for images
   - Implement lazy loading for large lists
   - Debounce search inputs
   - Use React.memo for expensive components

## Security Considerations

1. **Authentication**
   - Never expose access tokens to client
   - Store refresh tokens securely in database
   - Validate user ownership before operations
   - Use HTTPS in production

2. **Data Validation**
   - Validate all inputs on server side
   - Sanitize user-provided data
   - Use Prisma's type safety to prevent SQL injection
   - Validate environment variables on startup

3. **API Security**
   - Rate limit API endpoints
   - Implement CORS appropriately
   - Use secure session management
   - Validate OAuth state parameters

## Git Workflow

### Branch Naming
- Feature branches: `claude/claude-md-[session-id]`
- All work should be on designated feature branches
- Never push directly to main

### Commit Messages
- Use conventional commits format when possible
- Be descriptive about changes
- Reference issues if applicable

### Before Pushing
```bash
npm run check-types
npm run lint:strict
npm run build
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [NetEase Cloud Music API](https://binaryify.github.io/NeteaseCloudMusicApi)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Notes for AI Assistants

1. **Always check existing patterns** before implementing new features
2. **Run type checking** before suggesting code is complete
3. **Follow ESLint rules** strictly - they're enforced in CI
4. **Use the path alias** `@/` for imports from `src/`
5. **Consider database migrations** when modifying schema
6. **Test API endpoints** after implementation
7. **Update types** when adding new data structures
8. **Maintain consistency** with existing code style
9. **Document complex logic** with clear comments
10. **Consider error cases** and user experience

---

**Last Updated**: 2025-11-14
**Codebase Version**: Based on current state of repository
**Maintained By**: AI assistants working with this repository
