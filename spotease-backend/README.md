# Spotease Backend

Spring Boot backend for Spotease - Spotify and NetEase Music playlist converter.

## Tech Stack

- Spring Boot 3.2+
- Spring Data JPA
- Spring Security
- Spring WebSocket
- PostgreSQL
- Lombok

## Key Dependencies

- **Spotify Web API Java SDK** 9.4.0 - Official Spotify API client
- **NetEase Cloud Music API** - Community API service (Node.js)
- Spring Boot 3.2.1
- PostgreSQL 15
- Spring Data JPA
- Spring Security
- Spring WebFlux (WebClient for NetEase API)

## Prerequisites

- Java 17+
- Maven 3.8+
- PostgreSQL 14+

## Setup

1. **Create PostgreSQL database:**
```bash
psql -U postgres -c "CREATE DATABASE spotease;"
```

2. **Configure environment variables:**
```bash
export SPOTIFY_CLIENT_ID=your_spotify_client_id
export SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
export ENCRYPTION_KEY=your_32_character_encryption_key

# Optional (with defaults)
export DB_USERNAME=postgres
export DB_PASSWORD=postgres
export NETEASE_API_URL=https://netease-api.rivenlalala.xyz
```

3. **Update application.yml or set environment variables:**
- Set `ENCRYPTION_KEY` environment variable to a secure 32-character string
- Database credentials (DB_USERNAME, DB_PASSWORD) are configurable via environment variables and default to `postgres`

4. **Run the application:**
```bash
mvn spring-boot:run
```

Application will start on http://localhost:8080

## API Endpoints

### Authentication
- `GET /api/auth/spotify/login` - Get Spotify OAuth URL
- `GET /api/auth/spotify/callback` - Spotify OAuth callback
- `POST /api/auth/netease/qr` - Generate NetEase QR code
- `GET /api/auth/netease/qr/status?key=...` - Check QR scan status
- `GET /api/auth/status` - Get authentication status
- `POST /api/auth/logout` - Logout

### Playlists
- `GET /api/playlists/spotify` - List user's Spotify playlists
- `GET /api/playlists/netease` - List user's NetEase playlists
- `GET /api/playlists/{platform}/{id}` - Get single playlist details

### Review (Manual Search)
- `GET /api/conversions/{jobId}/matches/search?query=...` - Search for alternative tracks

### Health
- `GET /api/health` - Health check endpoint

## Project Structure

```
src/main/java/com/spotease/
├── config/          # Configuration classes
├── controller/      # REST controllers
├── service/         # Business logic
├── worker/          # Async workers
├── model/           # JPA entities
├── repository/      # Spring Data repositories
├── dto/             # Data transfer objects
└── util/            # Utility classes
```

## Development

### Running Tests
```bash
mvn test
```

### Building
```bash
mvn clean package
```

### Database Migrations

This project uses Hibernate auto-DDL (development only). For production, consider using Flyway or Liquibase.

## Implemented Features

**Core Services:**
- ✅ ConversionService - Job creation and validation
- ✅ ConversionWorker - Async background processor
- ✅ WebSocketService - Real-time job updates
- ✅ MatchingService - Track matching algorithm
- ✅ SpotifyService - Spotify SDK integration
- ✅ NeteaseService - NetEase API integration

**REST API Endpoints:**
- `POST /api/conversions` - Create new conversion job
- `GET /api/conversions` - List all user jobs
- `GET /api/conversions/{jobId}` - Get job details
- `DELETE /api/conversions/{jobId}` - Delete job
- `GET /api/conversions/{jobId}/matches/pending` - Get pending matches
- `POST /api/conversions/{jobId}/matches/{matchId}/approve` - Approve match
- `POST /api/conversions/{jobId}/matches/{matchId}/skip` - Skip match

**WebSocket:**
- `WS /ws/conversions` - Real-time job updates
- Topics: `/topic/conversions/{jobId}`

## Job Processing Flow

1. User creates conversion job via POST `/api/conversions`
2. Job status: QUEUED → backend saves job
3. ConversionWorker processes asynchronously
4. Job status: PROCESSING
5. For each track:
   - MatchingService finds best match
   - AUTO_MATCHED (≥0.85): Add to destination immediately
   - PENDING_REVIEW (0.60-0.84): Save for user review
   - FAILED (<0.60): Save for user review
6. WebSocket updates sent every 5 tracks
7. Job status: REVIEW_PENDING (if pending/failed) or COMPLETED
8. User reviews pending matches via frontend
9. Job status: COMPLETED when all reviewed

## WebSocket Message Format

```json
{
  "jobId": 1,
  "status": "PROCESSING",
  "totalTracks": 50,
  "processedTracks": 25,
  "highConfidenceMatches": 20,
  "lowConfidenceMatches": 3,
  "failedTracks": 2
}
```

### Track Matching Algorithm

**MatchingService** implements intelligent track matching between Spotify and NetEase Music:

**Features:**
- Multi-factor scoring: Duration (60%), Track name (20%), Artist (20%)
- Dynamic weight rebalancing when data is missing
- 3-tier search fallback strategy for maximum match rate
- Confidence-based thresholds:
  - AUTO_MATCHED (≥0.85): Automatically added to destination playlist
  - PENDING_REVIEW (0.60-0.84): Requires user review
  - FAILED (<0.60): No confident match found

**String Similarity:**
- Levenshtein distance algorithm for string comparison
- Normalization: lowercase, remove special chars, normalize "feat"/"ft."
- Handles artist name variations and track title differences

**Search Strategy:**
- Tier 1: `"{track name}" {first artist}` (quoted search)
- Tier 2: `{track name} {first artist}` (unquoted search)
- Tier 3: `{track name}` (name only, fallback)

**Usage:**
```java
TrackMatch match = matchingService.findBestMatch(
    sourceTrack,           // SpotifyTrack or NeteaseTrack
    Platform.NETEASE,      // Destination platform
    "access-token",        // Platform access token
    conversionJob          // ConversionJob entity
);
```

## Implementation Status

**Completed:**
- ✅ Project structure and dependencies
- ✅ JPA entities (User, ConversionJob, TrackMatch)
- ✅ Spring Data repositories
- ✅ Token encryption utility
- ✅ Spring Security configuration
- ✅ Async executor configuration
- ✅ Spotify OAuth authentication
- ✅ **Spotify SDK integration** (spotify-web-api-java 9.4.0)
- ✅ **NetEase Cloud Music API integration** (https://netease-api.rivenlalala.xyz)
- ✅ Track matching service with multi-tier fallback
- ✅ Background worker implementation
- ✅ WebSocket configuration (STOMP)
- ✅ Conversion job endpoints
- ✅ Review endpoints for pending matches
- ✅ CREATE and UPDATE playlist modes
- ✅ Error handling and retry logic

- ✅ **PlaylistController** - Browse Spotify and NetEase playlists
- ✅ **NetEase QR authentication** - Complete QR login flow
- ✅ **Manual search endpoint** - Alternative match search

**Backend Complete:** All core features implemented and tested.

**Next Steps:**
- Frontend integration
- End-to-end testing
- Production deployment

## CORS Configuration

### Overview

Spotease uses profile-based CORS configuration with explicit origin whitelisting to support cross-origin requests from the frontend while maintaining security.

### Configuration Files

- **Production:** `application.yml` - Default origin: `https://spotease.rivenlalala.xyz`
- **Development:** `application-dev.yml` - Local origin: `http://127.0.0.1:5173`

### Environment Variables

Override CORS origins using:
```bash
CORS_ALLOWED_ORIGINS=https://spotease.rivenlalala.xyz
```

Supports multiple origins (comma-separated):
```bash
CORS_ALLOWED_ORIGINS=https://spotease.rivenlalala.xyz,https://app.spotease.com
```

### Security Settings (Hardcoded)

- **Allowed Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers:** Content-Type, Authorization, Accept, X-Requested-With
- **Credentials:** Enabled (supports session cookies)
- **Max Age:** 3600 seconds (1 hour preflight cache)

### Session Cookie Configuration

**Production:**
- `SameSite`: Lax (allows OAuth redirects)
- `Secure`: true (HTTPS only)
- `HttpOnly`: true (XSS protection)
- `Domain`: .rivenlalala.xyz (shared across subdomains)

**Development:**
- `Secure`: false (allows HTTP)
- No domain setting (works with 127.0.0.1)

### Testing CORS Locally

```bash
# Start backend with dev profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Test CORS preflight in another terminal
curl -X OPTIONS http://127.0.0.1:8080/api/health \
  -H "Origin: http://127.0.0.1:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

**Expected:** CORS headers in response:
- `Access-Control-Allow-Origin: http://127.0.0.1:5173`
- `Access-Control-Allow-Credentials: true`

### Troubleshooting

**CORS headers not appearing:**
- Verify profile is active: Look for "The following profiles are active: dev"
- Check CORS origins match exactly (including protocol)

**Cookies not sent from frontend:**
- Ensure `credentials: 'include'` in fetch calls
- Verify `secure: false` in development profile

See `docs/plans/2025-12-29-cors-configuration-design.md` for complete design documentation.

## License

MIT
