# Spotease Complete Rework - Design Document

**Date:** 2025-12-27
**Status:** Design Phase
**Architecture:** React + Spring Boot

---

## Executive Summary

Spotease is being completely redesigned as a one-time playlist conversion tool between Spotify and NetEase Music. The new architecture uses React (Vite + shadcn/ui) for the frontend and Spring Boot for the backend, replacing the previous Next.js full-stack implementation.

### Core Functionality
- **One-time conversions** with two modes:
  - **Create Mode**: Convert playlist → new playlist on destination platform
  - **Update Mode**: Add missing tracks from source to existing destination playlist (additive merge)
- **Intelligent track matching** with confidence scoring
- **Manual review** for uncertain matches
- **Background processing** with real-time status updates

### Key Architectural Decisions
- React frontend deployed separately from Spring Boot backend
- Job queue with worker pattern for async conversions
- WebSocket for real-time dashboard updates
- PostgreSQL with Spring Data JPA for persistence
- Both Spotify and NetEase authentication required upfront

---

## 1. System Architecture Overview

### High-Level Components

**1. React Frontend (Vite + shadcn/ui + Tailwind)**
- Authentication pages (Spotify OAuth, NetEase QR)
- Playlist browser and selection
- Conversion dashboard with job status
- Card-based review interface for uncertain matches

**2. Spring Boot Backend**
- REST API controllers for CRUD operations
- Service layer for business logic
- Background job executor for conversions
- WebSocket endpoint for real-time updates

**3. PostgreSQL Database**
- User accounts and OAuth tokens
- Playlist metadata cache
- Conversion jobs and their states
- Track match decisions and mappings

**4. External APIs**
- Spotify Web API (OAuth-authenticated)
- NetEase Cloud Music API (community framework)

### Communication Flow

- **Frontend → Backend**: REST API calls for actions (start conversion, make decisions)
- **Backend → Frontend**: WebSocket for real-time job status updates
- **Backend → External APIs**: Fetch playlists, search tracks, modify playlists
- **Background Workers**: Poll job queue, process conversions asynchronously

### Session Management

- Spring Security with session-based authentication
- OAuth tokens stored securely in database (encrypted)
- Frontend maintains session cookie

---

## 2. Database Schema

### Entity Definitions

#### User
```
- id (PK)
- email
- createdAt, updatedAt
- spotifyUserId
- spotifyAccessToken (encrypted)
- spotifyRefreshToken (encrypted)
- spotifyTokenExpiry
- neteaseUserId
- neteaseCookie (encrypted)
- neteaseCookieExpiry
```

#### ConversionJob
```
- id (PK)
- userId (FK)
- sourcePlatform (SPOTIFY | NETEASE)
- sourcePlaylistId
- sourcePlaylistName
- destinationPlatform (SPOTIFY | NETEASE)
- destinationPlaylistId (nullable - for create mode)
- destinationPlaylistName
- mode (CREATE | UPDATE)
- status (QUEUED | PROCESSING | REVIEW_PENDING | COMPLETED | FAILED)
- createdAt, updatedAt, completedAt
- totalTracks
- processedTracks
- highConfidenceMatches
- lowConfidenceMatches
- failedTracks
```

#### TrackMatch
```
- id (PK)
- conversionJobId (FK)
- sourceTrackId
- sourceTrackName
- sourceArtist
- sourceAlbum
- sourceDuration
- sourceISRC (nullable)
- destinationTrackId (nullable)
- destinationTrackName (nullable)
- destinationArtist (nullable)
- matchConfidence (0.0 - 1.0)
- status (AUTO_MATCHED | PENDING_REVIEW | USER_APPROVED | USER_SKIPPED | FAILED)
- errorMessage (nullable)
- reviewedAt (nullable)
- appliedAt (nullable)
```

### Key Design Decisions

- Encrypted sensitive tokens at rest using AES-256
- ConversionJob tracks progress metrics for dashboard display
- TrackMatch stores full source and destination details for review UI
- Status enums drive workflow state machine
- Timestamps enable complete audit trail

---

## 3. REST API Endpoints

### Authentication Endpoints
```
POST   /api/auth/spotify/login          # Redirect to Spotify OAuth
GET    /api/auth/spotify/callback       # Handle OAuth callback
POST   /api/auth/netease/qr             # Generate QR code
GET    /api/auth/netease/qr/status      # Poll QR scan status
POST   /api/auth/logout                 # Clear session
GET    /api/auth/status                 # Check if both platforms connected
```

### Playlist Endpoints
```
GET    /api/playlists/spotify           # List user's Spotify playlists
GET    /api/playlists/netease           # List user's NetEase playlists
GET    /api/playlists/{platform}/{id}   # Get single playlist details
```

### Conversion Endpoints
```
POST   /api/conversions                 # Start new conversion job
GET    /api/conversions                 # List all user's jobs
GET    /api/conversions/{jobId}         # Get job details
DELETE /api/conversions/{jobId}         # Delete completed job
```

### Review Endpoints
```
GET    /api/conversions/{jobId}/pending-matches              # Get tracks needing review
POST   /api/conversions/{jobId}/matches/{matchId}/approve    # Approve match
POST   /api/conversions/{jobId}/matches/{matchId}/skip       # Skip track
POST   /api/conversions/{jobId}/matches/{matchId}/search     # Search alternatives
```

### WebSocket Endpoint
```
WS     /ws/conversions    # Real-time job updates
```

### Example Request/Response

**POST /api/conversions**
```json
Request:
{
  "sourcePlatform": "SPOTIFY",
  "sourcePlaylistId": "37i9dQZF1DXcBWIGoYBM5M",
  "mode": "CREATE",
  "destinationPlaylistName": "My Converted Playlist"
}

Response:
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "QUEUED",
  "totalTracks": 50,
  "processedTracks": 0
}
```

**WebSocket Message Format**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PROCESSING",
  "processedTracks": 25,
  "totalTracks": 50,
  "highConfidenceMatches": 20,
  "lowConfidenceMatches": 3,
  "failedTracks": 2
}
```

---

## 4. Track Matching Algorithm

### Matching Process Flow

1. **Extract metadata** from source track:
   - Track name, artist(s), album, duration, ISRC (if available)

2. **Search destination platform**:
   - Query: `"{track name}" {first artist}`
   - Fetch top 10 results

3. **Score each candidate**:

   **Step 1: ISRC Check**
   - If source has ISRC AND candidate has ISRC AND they match exactly
   - → Instant score = 1.0 (auto-match, skip further scoring)

   **Step 2: Multi-Factor Scoring** (if no ISRC match):
   ```
   Score Components:
   - Duration match: 60%
     - ±3 seconds = 100%
     - Linear falloff to ±10 seconds = 0%
   - Track name similarity: 20%
     - Levenshtein distance, normalized
   - Artist similarity: 20%
     - Compare all artists, use best match

   Final Score: 0.0 - 1.0
   ```

4. **Apply threshold logic**:
   - **Score ≥ 0.85**: AUTO_MATCHED (high confidence, add immediately)
   - **Score 0.60 - 0.84**: PENDING_REVIEW (low confidence, user decides)
   - **Score < 0.60**: FAILED (add to review queue)

5. **String similarity helper**:
   - Normalize: lowercase, remove special characters, trim whitespace
   - Use Levenshtein distance algorithm
   - Account for common variations: "feat.", "ft.", "&", "and"

### Fallback Handling

- If search returns 0 results: mark as FAILED, add to review queue
- Network/API errors: retry 3 times with exponential backoff, then mark as FAILED
- Failed and uncertain matches both go to review queue

### Review Interface Data

- Show top 3 candidates with their scores
- Allow user to manually search if none match
- User can skip (track won't be added to destination playlist)

---

## 5. Background Job Processing

### Job Lifecycle

**1. Job Creation** (user initiates conversion):
- Create ConversionJob record with status = QUEUED
- Return jobId to frontend immediately
- Trigger async worker to process job

**2. Worker Processing**:
```
For each track in source playlist:
  a. Fetch track metadata from source platform
  b. Search destination platform for matches
  c. Check ISRC match first (instant 1.0 if matched)
  d. Calculate match score if no ISRC match
  e. Create TrackMatch record with appropriate status
  f. If AUTO_MATCHED: immediately add to destination playlist
  g. Update job progress counters
  h. Send WebSocket update to frontend

After all tracks processed:
  - Set job status = REVIEW_PENDING (if any pending/failed matches)
  - Set job status = COMPLETED (if all tracks auto-matched)
  - Send final WebSocket update
```

**3. Review Phase** (user reviews pending/failed matches):
- User approves match → immediately add to destination playlist, mark as USER_APPROVED and appliedAt timestamp
- User skips → mark as USER_SKIPPED, don't add to playlist
- Update job status to COMPLETED when no more pending reviews

### Spring Implementation Details

- Use `@Async` annotation with custom thread pool executor
- Configuration: 5 worker threads, queue size 100
- Process one job per user at a time (prevents API rate limit issues)
- Worker method signature: `@Async void processConversionJob(Long jobId)`

### Update Mode Behavior

When mode = UPDATE:
- Check if track already exists in destination playlist
- Skip adding if already present
- Mark as AUTO_MATCHED but don't modify playlist
- Result: destination playlist contains all tracks from source (additive merge)

---

## 6. Frontend User Flows

### Flow 1: Initial Authentication
```
1. Landing page → "Connect Spotify" button
2. Redirect to Spotify OAuth → user authorizes
3. Return to app → "Connect NetEase" button appears
4. Show NetEase QR code modal
5. User scans with NetEase mobile app → frontend polls for status
6. Both platforms connected → redirect to dashboard
```

### Flow 2: Start Conversion (Create Mode)
```
1. Dashboard → "New Conversion" button
2. Select source platform (Spotify or NetEase)
3. Browse playlists, select one
4. Choose "Create new playlist"
5. Enter new playlist name for destination
6. Click "Start Conversion"
7. Redirect to conversion dashboard showing new job in progress
```

### Flow 3: Start Conversion (Update Mode)
```
1-3. Same as Create Mode (select source platform and playlist)
4. Choose "Update existing playlist"
5. Browse destination platform playlists, manually select one
6. Show confirmation: "This will add missing tracks to [playlist name]"
7. Click "Start Conversion"
8. Redirect to conversion dashboard
```

### Flow 4: Monitor Conversion
```
1. Dashboard shows job cards with:
   - Source → Destination playlist info
   - Progress bar (X/Y tracks processed)
   - Real-time updates via WebSocket
   - High confidence / Low confidence / Failed counts
2. When status changes to REVIEW_PENDING:
   - "Review X matches" button appears on job card
```

### Flow 5: Review Matches (Card-Based)
```
1. Click "Review matches" → enter card-based review UI
2. For each PENDING_REVIEW or FAILED track:
   - Show source track info (name, artist, album, duration)
   - Show top 3 destination candidates with match scores
   - Actions available:
     - "Approve Match 1/2/3" buttons
     - "Search Manually" button
     - "Skip" button
3. On approve:
   - Track immediately added to destination playlist
   - Next card automatically appears
4. On skip:
   - Track marked as USER_SKIPPED
   - Next card appears
5. When all reviews complete:
   - Return to dashboard
   - Job status updated to COMPLETED
```

---

## 7. Frontend Architecture

### Tech Stack

- **Build Tool**: Vite
- **Framework**: React 19
- **Routing**: React Router
- **UI Library**: shadcn/ui (Tailwind-based components)
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **WebSocket**: Native WebSocket API

### Project Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── SpotifyLoginButton.tsx
│   │   ├── NeteaseQRModal.tsx
│   │   └── AuthStatus.tsx
│   ├── playlists/
│   │   ├── PlaylistBrowser.tsx          # Grid of playlists
│   │   ├── PlaylistCard.tsx             # Individual playlist item
│   │   └── PlaylistSelector.tsx         # Source/dest selection flow
│   ├── conversions/
│   │   ├── ConversionDashboard.tsx      # Main dashboard
│   │   ├── ConversionJobCard.tsx        # Single job status card
│   │   ├── ProgressBar.tsx              # Visual progress indicator
│   │   └── ReviewInterface.tsx          # Card-based review UI
│   ├── common/
│   │   ├── Button.tsx                   # shadcn/ui button
│   │   ├── Card.tsx                     # shadcn/ui card
│   │   └── Modal.tsx                    # shadcn/ui dialog
│   └── layout/
│       ├── Header.tsx
│       └── Layout.tsx
├── hooks/
│   ├── useAuth.ts                       # Auth state management
│   ├── useWebSocket.ts                  # WebSocket connection hook
│   └── useConversions.ts                # TanStack Query hooks
├── api/
│   └── client.ts                        # Axios instance + endpoint functions
├── pages/
│   ├── Landing.tsx                      # Landing/auth page
│   ├── Dashboard.tsx                    # Main conversion dashboard
│   ├── NewConversion.tsx                # Start new conversion flow
│   └── ReviewMatches.tsx                # Review uncertain matches
└── types/
    ├── auth.ts
    ├── playlist.ts
    ├── conversion.ts
    └── track.ts
```

### State Management Strategy

**Server State** (TanStack Query):
- Playlists from both platforms
- Conversion jobs list
- Individual job details
- Pending matches for review
- Cache invalidation triggered by WebSocket updates

**Global State** (React Context):
- Authentication status (logged in, platforms connected)
- Current user information
- Session token

**Local State** (useState):
- UI state (modals open/closed, form inputs)
- Current review card index
- Loading states

**Real-Time Updates** (WebSocket):
- Custom `useWebSocket` hook connects on mount
- Listens for job update messages
- Invalidates TanStack Query cache for affected job
- Triggers automatic re-fetch and UI update

### Key Component Patterns

**PlaylistBrowser**:
- Fetches playlists using TanStack Query
- Displays grid of PlaylistCard components
- Handles loading and error states

**ConversionJobCard**:
- Subscribes to job updates via WebSocket
- Shows real-time progress bar
- Conditionally renders "Review" button based on status

**ReviewInterface**:
- Card-based swipe/click-through UI
- Shows one uncertain match at a time
- Immediately applies decision and moves to next

---

## 8. Spring Boot Backend Architecture

### Tech Stack

- **Framework**: Spring Boot 3.2+
- **Web**: Spring Boot Web
- **Data**: Spring Boot Data JPA
- **Security**: Spring Boot Security
- **WebSocket**: Spring Boot WebSocket
- **HTTP Client**: Spring WebFlux (WebClient)
- **Database**: PostgreSQL
- **Utilities**: Lombok, Jackson

### Project Structure

```
src/main/java/com/spotease/
├── config/
│   ├── SecurityConfig.java              # Spring Security configuration
│   ├── WebSocketConfig.java             # WebSocket STOMP config
│   └── AsyncConfig.java                 # Thread pool executor config
├── controller/
│   ├── AuthController.java              # Authentication endpoints
│   ├── PlaylistController.java          # Playlist CRUD endpoints
│   ├── ConversionController.java        # Conversion job endpoints
│   └── ReviewController.java            # Match review endpoints
├── service/
│   ├── SpotifyService.java              # Spotify API client wrapper
│   ├── NeteaseService.java              # NetEase API client wrapper
│   ├── ConversionService.java           # Job orchestration logic
│   ├── MatchingService.java             # Track matching algorithm
│   └── WebSocketService.java            # Push updates to clients
├── worker/
│   └── ConversionWorker.java            # @Async job processor
├── model/
│   ├── User.java                        # JPA entity
│   ├── ConversionJob.java               # JPA entity
│   └── TrackMatch.java                  # JPA entity
├── repository/
│   ├── UserRepository.java              # Spring Data JPA repository
│   ├── ConversionJobRepository.java
│   └── TrackMatchRepository.java
├── dto/
│   ├── ConversionRequest.java           # API request DTOs
│   ├── ConversionResponse.java          # API response DTOs
│   ├── TrackMatchDto.java
│   └── WebSocketMessage.java
└── util/
    ├── StringSimilarity.java            # Levenshtein distance algorithm
    └── TokenEncryption.java             # AES-256 encryption for tokens
```

### Service Layer Design

**SpotifyService**:
- WebClient configured with base URL and retry logic
- Token refresh handling (check expiry, refresh if needed)
- Methods: `getPlaylists()`, `getPlaylistTracks()`, `searchTrack()`, `addTracksToPlaylist()`

**NeteaseService**:
- WebClient configured for NetEase API
- Cookie-based authentication (pass cookie with each request)
- Methods: `getPlaylists()`, `getPlaylistTracks()`, `searchTrack()`, `addTracksToPlaylist()`

**ConversionService**:
- Orchestrates conversion job creation
- Validates user input and permissions
- Delegates to ConversionWorker for async processing
- Manages job status transitions

**MatchingService**:
- Implements track matching algorithm
- Calculates confidence scores
- Determines AUTO_MATCHED vs PENDING_REVIEW
- String normalization and Levenshtein distance

**WebSocketService**:
- Uses SimpMessagingTemplate to broadcast updates
- Sends to user-specific channels: `/topic/conversions/{userId}`
- Methods: `sendJobUpdate()`, `sendJobComplete()`

### Async Worker Pattern

**ConversionWorker**:
```java
@Service
public class ConversionWorker {

  @Async
  public void processConversionJob(Long jobId) {
    // Load job from database
    // For each track: search, match, score, decide
    // Send WebSocket updates periodically
    // Update job status on completion
  }
}
```

**AsyncConfig**:
```java
@Configuration
@EnableAsync
public class AsyncConfig {

  @Bean
  public Executor taskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(5);
    executor.setMaxPoolSize(5);
    executor.setQueueCapacity(100);
    executor.setThreadNamePrefix("conversion-worker-");
    executor.initialize();
    return executor;
  }
}
```

### Dependencies (Maven)

```xml
<dependencies>
  <!-- Spring Boot Starters -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
  </dependency>

  <!-- Database -->
  <dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
  </dependency>

  <!-- Utilities -->
  <dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
  </dependency>
</dependencies>
```

---

## 9. Security & Data Protection

### Authentication & Authorization

- Spring Security with session-based authentication
- All API endpoints require authenticated session (except `/api/auth/*`)
- User can only access their own conversion jobs and playlists
- Job ownership validated on every request

### Token Security

- Encrypt OAuth tokens and cookies at rest in database
- Use AES-256 encryption with application secret key
- Never expose raw tokens in API responses
- Tokens only decrypted in service layer when making API calls

### API Security

- CORS configuration allows React frontend origin only
- CSRF protection enabled for state-changing operations
- Rate limiting per user (prevent API abuse)
- Input validation on all request DTOs

### Data Privacy

- User can delete account → cascade delete all conversion jobs and track matches
- No tracking or analytics beyond operational data
- OAuth tokens refreshed and revalidated before each use
- Session timeout after 24 hours of inactivity

---

## 10. Performance & Scalability

_(Placeholder - details to be determined during implementation)_

Topics to cover:
- Playlist metadata caching strategy
- Batch operations for adding tracks
- Database indexing plan
- WebSocket message throttling
- Rate limit management for external APIs
- Future scaling path (Redis, separate workers, microservices)

---

## Implementation Notes

### Phase 1: Backend Foundation
- Set up Spring Boot project structure
- Configure PostgreSQL and create JPA entities
- Implement authentication endpoints (Spotify OAuth, NetEase QR)
- Build Spotify and NetEase service wrappers with WebClient

### Phase 2: Core Conversion Logic
- Implement track matching algorithm with scoring
- Build conversion worker with @Async processing
- Create conversion and review endpoints
- Set up WebSocket for real-time updates

### Phase 3: Frontend Development
- Set up Vite + React project with shadcn/ui
- Build authentication flow and playlist browser
- Create conversion dashboard with WebSocket integration
- Implement card-based review interface

### Phase 4: Integration & Testing
- End-to-end testing of conversion flows
- Error handling and edge case validation
- Performance testing with large playlists
- Security audit

### Phase 5: Deployment & Polish
- Determine deployment strategy
- Set up CI/CD pipeline
- Production configuration
- User documentation

---

## Open Questions

_(To be resolved during implementation)_

- Exact rate limits for Spotify and NetEase APIs
- Optimal WebSocket update frequency (every N tracks?)
- Database connection pool sizing
- Session storage strategy (in-memory vs Redis)
- Frontend deployment platform decision
- Backend deployment platform decision

---

## Appendix: Technology Choices Rationale

**Why React + Spring Boot over Next.js?**
- Separation of concerns: frontend and backend can evolve independently
- Developer familiarity: Spring Boot expertise available
- Clearer architecture for this use case (async job processing, WebSocket)

**Why WebSocket over Server-Sent Events (SSE)?**
- Bi-directional communication (though we primarily use server→client)
- Better browser support and debugging tools
- Spring WebSocket has excellent integration

**Why PostgreSQL over other databases?**
- Mature, reliable, battle-tested
- Excellent Spring Data JPA support
- ACID compliance for job state transitions
- Free tier available on most hosting platforms

**Why TanStack Query over Redux?**
- Server state is the dominant state concern
- Built-in caching, refetching, and optimistic updates
- Less boilerplate than Redux for this use case
- Better developer experience for API-driven apps

**Why shadcn/ui over other component libraries?**
- Copy-paste approach gives full control
- Built on Tailwind (consistent styling)
- Modern, clean aesthetic
- No bundle size overhead from unused components

---

**End of Design Document**
