# Auth Flow Design

## Overview

Design for the authentication flow connecting Spotify and NetEase Music accounts before users can access the dashboard.

## Host Consistency Requirement

Spotify enforces `127.0.0.1` (not `localhost`) for OAuth redirect URIs in development. To ensure session cookies work correctly across the OAuth flow, all components must use `127.0.0.1`:

| Component | URL |
|-----------|-----|
| Frontend (browser access) | `http://127.0.0.1:5173` |
| Backend API | `http://127.0.0.1:8080` |
| Spotify redirect URI | `http://127.0.0.1:8080/api/auth/spotify/callback` |
| Post-OAuth redirect | `http://127.0.0.1:5173/` |
| CORS allowed origin | `http://127.0.0.1:5173` |

## Flow

```
Landing (/)
    │
    ▼ Click "Connect Spotify"
Spotify OAuth
    │
    ▼ Success
Backend redirects to http://127.0.0.1:5173/
    │
    ▼ Page loads, shows "Spotify ✓ Connected"
User clicks "Connect NetEase"
    │
    ▼ QR modal opens
User scans QR (or enters cookie manually)
    │
    ▼ Success
Auto-redirect to /dashboard
```

## Spotify OAuth Callback

**Current behavior:** Returns JSON `{"success": true, "email": "...", "userId": 1}`

**New behavior:** Redirect to `http://127.0.0.1:5173/` (silent, no toast)

The green "✓ Connected" badge on the Landing page provides sufficient feedback.

## NetEase QR Modal

### Layout

1. QR code displayed at top (when generation succeeds)
2. "Having trouble? Enter cookie manually" expandable link below
3. When expanded: textarea for cookie input + submit button

### Error Handling

When QR generation fails (timeout, API error):
- Auto-expand the manual cookie input section
- Show error message explaining QR is unavailable
- User can paste NetEase cookie directly

### Manual Cookie Input

Users obtain their NetEase cookie by:
1. Logging into music.163.com in browser
2. Opening dev tools → Application → Cookies
3. Copying the cookie value

## Backend Changes

### 1. Update Spotify Callback

**File:** `AuthController.java`

**Change:** `spotifyCallback()` should redirect instead of returning JSON.

```java
@GetMapping("/spotify/callback")
public ResponseEntity<?> spotifyCallback(...) {
    // ... existing validation and handling ...

    // Instead of returning JSON, redirect to frontend
    return ResponseEntity.status(HttpStatus.FOUND)
        .header("Location", "http://127.0.0.1:5173/")
        .build();
}
```

### 2. Update CORS Configuration

**File:** `application-dev.yml`

**Change:** Update allowed origin from `localhost` to `127.0.0.1`

```yaml
cors:
  allowed-origins: http://127.0.0.1:5173
```

### 3. New Endpoint: Manual Cookie Submit

**Endpoint:** `POST /api/auth/netease/cookie`

**Request body:**
```json
{
  "cookie": "MUSIC_U=..."
}
```

**Response:**
```json
{
  "success": true
}
```

**Implementation:** Reuse existing `authService.handleNeteaseQRLogin(userId, cookie)`

## Frontend Changes

### 1. NeteaseQRModal Component

- Add expandable "Having trouble?" section
- Add textarea for cookie input
- Add submit button for manual cookie
- Auto-expand on QR generation error

### 2. Auth API

Add new method:
```typescript
submitNeteaseCookie: async (cookie: string): Promise<void> => {
  await apiClient.post("/api/auth/netease/cookie", { cookie });
}
```

## Security Considerations

- NetEase cookies are sensitive credentials
- Cookies are encrypted before storage (existing encryption service)
- HTTPS required in production
- Session-based auth ensures cookies are tied to authenticated users
