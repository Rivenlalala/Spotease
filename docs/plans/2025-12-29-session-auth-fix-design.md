# Session Authentication Fix

## Problem

Two related issues with authentication:

1. **`/api/auth/status` returns hardcoded values**: The endpoint always returns `spotifyConnected: true` and `neteaseConnected: false` instead of checking actual user data.

2. **Protected endpoints return 401**: After Spotify OAuth login, endpoints under `/api/**` (except `/api/auth/**`) return 401 Unauthorized because Spring Security doesn't recognize the session-based authentication.

### Root Cause

- The Spotify callback stores `userId` in `HttpSession`, but never sets a Spring Security `Authentication` object
- Spring Security 6.x requires explicit configuration to persist `SecurityContext` to session
- The `/status` endpoint doesn't query the database to check actual connection status

## Solution

### 1. Create AuthStatusResponse DTO

**File**: `dto/AuthStatusResponse.java` (new file)

```java
package com.spotease.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthStatusResponse {
    private boolean authenticated;
    private Long userId;
    private boolean spotifyConnected;
    private boolean neteaseConnected;
}
```

### 2. SecurityConfig - Enable Session-Based Security Context

**File**: `SecurityConfig.java`

Add session management configuration to persist `SecurityContext` to `HttpSession`:

```java
http
    .cors(cors -> cors.configurationSource(corsConfigurationSource()))
    .csrf(csrf -> csrf.disable())
    .sessionManagement(session -> session
        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
    )
    .securityContext(context -> context
        .requireExplicitSave(false)  // auto-save SecurityContext to session
    )
    // ... rest of existing config
```

### 3. AuthController - Set Authentication After OAuth

**File**: `AuthController.java`

In `spotifyCallback()`, after storing userId in session, set Spring Security authentication:

```java
// After: session.setAttribute("userId", user.getId());

Authentication auth = new UsernamePasswordAuthenticationToken(
    user.getId(),   // principal
    null,           // credentials
    List.of()       // authorities
);
SecurityContextHolder.getContext().setAuthentication(auth);
```

**Imports to add**:
```java
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
```

### 4. AuthService - Add Connection Status Method

**File**: `AuthService.java`

Add method to check actual user connection status:

```java
public AuthStatusResponse getUserConnectionStatus(Long userId) {
    User user = userRepository.findById(userId).orElse(null);

    if (user == null) {
        return AuthStatusResponse.builder()
            .authenticated(false)
            .spotifyConnected(false)
            .neteaseConnected(false)
            .build();
    }

    boolean spotifyConnected = user.getSpotifyAccessToken() != null
        && !user.getSpotifyAccessToken().isEmpty();
    boolean neteaseConnected = user.getNeteaseCookie() != null
        && !user.getNeteaseCookie().isEmpty();

    return AuthStatusResponse.builder()
        .authenticated(true)
        .userId(userId)
        .spotifyConnected(spotifyConnected)
        .neteaseConnected(neteaseConnected)
        .build();
}
```

### 5. AuthController - Update Status Endpoint

**File**: `AuthController.java`

Replace hardcoded response with service call:

```java
@GetMapping("/status")
public ResponseEntity<AuthStatusResponse> getAuthStatus(HttpSession session) {
    Long userId = (Long) session.getAttribute("userId");

    if (userId == null) {
        return ResponseEntity.ok(AuthStatusResponse.builder()
            .authenticated(false)
            .spotifyConnected(false)
            .neteaseConnected(false)
            .build());
    }

    return ResponseEntity.ok(authService.getUserConnectionStatus(userId));
}
```

## Files Changed

| File | Change |
|------|--------|
| `dto/AuthStatusResponse.java` | New DTO for auth status response |
| `SecurityConfig.java` | Add session management and security context config |
| `AuthController.java` | Set authentication after OAuth, update `/status` endpoint |
| `AuthService.java` | Add `getUserConnectionStatus()` method |

## Testing

1. Start backend, navigate to frontend
2. Login via Spotify OAuth
3. Verify `/api/auth/status` returns correct `spotifyConnected` value based on DB
4. Verify `/api/playlists` no longer returns 401
5. Connect NetEase, verify `neteaseConnected` updates to `true`
6. Logout, verify all endpoints require re-authentication
