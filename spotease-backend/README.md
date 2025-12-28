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
- `POST /api/auth/netease/qr` - Generate NetEase QR code (stub)
- `GET /api/auth/netease/qr/status` - Check QR scan status (stub)
- `GET /api/auth/status` - Get authentication status
- `POST /api/auth/logout` - Logout

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

## Current Implementation Status

**Implemented:**
- ✅ Project structure and dependencies
- ✅ JPA entities (User, ConversionJob, TrackMatch)
- ✅ Spring Data repositories
- ✅ Token encryption utility
- ✅ Spring Security configuration
- ✅ Async executor configuration
- ✅ Spotify OAuth authentication
- ✅ SpotifyService for API calls
- ✅ **Spotify SDK integration** (spotify-web-api-java 9.4.0)
- ✅ **NetEase Cloud Music API integration** (https://netease-api.rivenlalala.xyz)

**Implemented Services:**
- **SpotifyService**: Full integration with Spotify Web API SDK
  - Get user playlists
  - Get playlist tracks
  - Search tracks
  - Add tracks to playlist

- **NeteaseService**: Integration with NetEase Cloud Music API service
  - Get user playlists
  - Get playlist tracks
  - Search tracks
  - Add tracks to playlist

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

**TODO:**
- ⏳ NetEase QR authentication implementation
- ⏳ Playlist endpoints
- ⏳ Conversion job endpoints
- ✅ Track matching service
- ⏳ Background worker implementation
- ⏳ WebSocket configuration
- ⏳ Review endpoints

## License

MIT
