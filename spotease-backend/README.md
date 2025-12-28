# Spotease Backend

Spring Boot backend for Spotease - Spotify and NetEase Music playlist converter.

## Tech Stack

- Spring Boot 3.2+
- Spring Data JPA
- Spring Security
- Spring WebSocket
- PostgreSQL
- Lombok

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
export DB_USERNAME=postgres  # optional, defaults to postgres
export DB_PASSWORD=postgres  # optional, defaults to postgres
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

## Status

**Implemented:**
- ✅ Project structure and dependencies
- ✅ JPA entities (User, ConversionJob, TrackMatch)
- ✅ Spring Data repositories
- ✅ Token encryption utility
- ✅ Spring Security configuration
- ✅ Async executor configuration
- ✅ Spotify OAuth authentication
- ✅ SpotifyService for API calls

**TODO:**
- ⏳ NetEase QR authentication implementation
- ⏳ NeteaseService implementation
- ⏳ Playlist endpoints
- ⏳ Conversion job endpoints
- ⏳ Track matching service
- ⏳ Background worker implementation
- ⏳ WebSocket configuration
- ⏳ Review endpoints

## License

MIT
