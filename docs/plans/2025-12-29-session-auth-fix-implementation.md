# Session Authentication Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix session authentication so protected endpoints recognize logged-in users and `/api/auth/status` returns actual connection status from the database.

**Architecture:** Add Spring Security authentication object after OAuth callback, configure session-based security context persistence, and query user data for real connection status.

**Tech Stack:** Spring Boot 3.x, Spring Security 6.x, JPA/Hibernate, JUnit 5, Mockito, MockMvc

---

## Task 1: Create AuthStatusResponse DTO

**Files:**
- Create: `spotease-backend/src/main/java/com/spotease/dto/AuthStatusResponse.java`

**Step 1: Create the DTO file**

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

**Step 2: Verify compilation**

Run: `cd spotease-backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/dto/AuthStatusResponse.java
git commit -m "feat: add AuthStatusResponse DTO for auth status endpoint"
```

---

## Task 2: Add getUserConnectionStatus to AuthService

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/service/AuthService.java`
- Test: `spotease-backend/src/test/java/com/spotease/service/AuthServiceTest.java`

**Step 1: Write failing test for user not found**

Add to `AuthServiceTest.java`:

```java
@Test
void testGetUserConnectionStatus_UserNotFound() {
    // Arrange
    when(userRepository.findById(999L)).thenReturn(Optional.empty());

    // Act
    AuthStatusResponse result = authService.getUserConnectionStatus(999L);

    // Assert
    assertThat(result.isAuthenticated()).isFalse();
    assertThat(result.getUserId()).isNull();
    assertThat(result.isSpotifyConnected()).isFalse();
    assertThat(result.isNeteaseConnected()).isFalse();
}
```

Add import:
```java
import com.spotease.dto.AuthStatusResponse;
import java.util.Optional;
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=AuthServiceTest#testGetUserConnectionStatus_UserNotFound -q`
Expected: FAIL with "cannot find symbol: method getUserConnectionStatus"

**Step 3: Write failing test for user with Spotify only**

Add to `AuthServiceTest.java`:

```java
@Test
void testGetUserConnectionStatus_SpotifyOnly() {
    // Arrange
    User user = new User();
    user.setId(1L);
    user.setSpotifyAccessToken("encrypted-token");
    user.setNeteaseCookie(null);

    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    // Act
    AuthStatusResponse result = authService.getUserConnectionStatus(1L);

    // Assert
    assertThat(result.isAuthenticated()).isTrue();
    assertThat(result.getUserId()).isEqualTo(1L);
    assertThat(result.isSpotifyConnected()).isTrue();
    assertThat(result.isNeteaseConnected()).isFalse();
}
```

**Step 4: Write failing test for user with both platforms**

Add to `AuthServiceTest.java`:

```java
@Test
void testGetUserConnectionStatus_BothPlatforms() {
    // Arrange
    User user = new User();
    user.setId(1L);
    user.setSpotifyAccessToken("encrypted-token");
    user.setNeteaseCookie("encrypted-cookie");

    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    // Act
    AuthStatusResponse result = authService.getUserConnectionStatus(1L);

    // Assert
    assertThat(result.isAuthenticated()).isTrue();
    assertThat(result.getUserId()).isEqualTo(1L);
    assertThat(result.isSpotifyConnected()).isTrue();
    assertThat(result.isNeteaseConnected()).isTrue();
}
```

**Step 5: Implement getUserConnectionStatus method**

Add to `AuthService.java` (after `handleNeteaseQRLogin` method):

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

Add import to `AuthService.java`:
```java
import com.spotease.dto.AuthStatusResponse;
```

**Step 6: Run all AuthService tests**

Run: `cd spotease-backend && ./mvnw test -Dtest=AuthServiceTest -q`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/service/AuthService.java \
        spotease-backend/src/test/java/com/spotease/service/AuthServiceTest.java
git commit -m "feat: add getUserConnectionStatus method to AuthService"
```

---

## Task 3: Update AuthController /status endpoint

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/controller/AuthController.java`
- Test: `spotease-backend/src/test/java/com/spotease/controller/AuthControllerTest.java`

**Step 1: Write failing test for unauthenticated status**

Add to `AuthControllerTest.java`:

```java
@Test
void testGetAuthStatus_Unauthenticated() throws Exception {
    // Act & Assert
    mockMvc.perform(get("/api/auth/status"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.authenticated", is(false)))
        .andExpect(jsonPath("$.spotifyConnected", is(false)))
        .andExpect(jsonPath("$.neteaseConnected", is(false)));

    verifyNoInteractions(authService);
}
```

**Step 2: Write failing test for authenticated status with Spotify**

Add to `AuthControllerTest.java`:

```java
@Test
void testGetAuthStatus_AuthenticatedWithSpotify() throws Exception {
    // Arrange
    AuthStatusResponse response = AuthStatusResponse.builder()
        .authenticated(true)
        .userId(1L)
        .spotifyConnected(true)
        .neteaseConnected(false)
        .build();

    when(authService.getUserConnectionStatus(1L)).thenReturn(response);

    // Act & Assert
    mockMvc.perform(get("/api/auth/status")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.authenticated", is(true)))
        .andExpect(jsonPath("$.userId", is(1)))
        .andExpect(jsonPath("$.spotifyConnected", is(true)))
        .andExpect(jsonPath("$.neteaseConnected", is(false)));

    verify(authService).getUserConnectionStatus(1L);
}
```

Add import to `AuthControllerTest.java`:
```java
import com.spotease.dto.AuthStatusResponse;
```

**Step 3: Run tests to verify they fail**

Run: `cd spotease-backend && ./mvnw test -Dtest=AuthControllerTest#testGetAuthStatus_Unauthenticated -q`
Expected: FAIL (current implementation returns hardcoded values)

**Step 4: Update getAuthStatus endpoint**

Replace the existing `getAuthStatus` method in `AuthController.java`:

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

Add import to `AuthController.java`:
```java
import com.spotease.dto.AuthStatusResponse;
```

**Step 5: Run AuthController tests**

Run: `cd spotease-backend && ./mvnw test -Dtest=AuthControllerTest -q`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/controller/AuthController.java \
        spotease-backend/src/test/java/com/spotease/controller/AuthControllerTest.java
git commit -m "feat: update /status endpoint to return real connection status"
```

---

## Task 4: Configure Spring Security for session-based authentication

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/config/SecurityConfig.java`

**Step 1: Add session management configuration**

Update the `securityFilterChain` method in `SecurityConfig.java`:

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(csrf -> csrf.disable())
        .sessionManagement(session -> session
            .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
        )
        .securityContext(context -> context
            .requireExplicitSave(false)
        )
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/health").permitAll()
            .requestMatchers("/api/auth/**").permitAll()
            .requestMatchers("/api/**").authenticated()
            .anyRequest().permitAll()
        )
        .exceptionHandling(ex -> ex
            .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
        )
        .formLogin(form -> form.disable())
        .httpBasic(basic -> basic.disable());

    return http.build();
}
```

Add import:
```java
import org.springframework.security.config.http.SessionCreationPolicy;
```

**Step 2: Verify compilation**

Run: `cd spotease-backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/config/SecurityConfig.java
git commit -m "feat: configure session-based security context persistence"
```

---

## Task 5: Set Spring Security Authentication after OAuth

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/controller/AuthController.java`
- Test: `spotease-backend/src/test/java/com/spotease/controller/AuthControllerTest.java`

**Step 1: Update spotifyCallback to set Authentication**

Update the `spotifyCallback` method in `AuthController.java`. After the line `session.setAttribute("userId", user.getId());`, add:

```java
// Set Spring Security authentication
Authentication auth = new UsernamePasswordAuthenticationToken(
    user.getId(),   // principal
    null,           // credentials
    List.of()       // authorities
);
SecurityContextHolder.getContext().setAuthentication(auth);
```

Add imports to `AuthController.java`:
```java
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
```

**Step 2: Update existing callback test to verify authentication is set**

Modify the `testSpotifyCallback_Success_RedirectsToFrontend` test in `AuthControllerTest.java`:

```java
@Test
void testSpotifyCallback_Success_RedirectsToFrontend() throws Exception {
    // Arrange
    MockHttpSession session = new MockHttpSession();
    session.setAttribute("spotify_oauth_state", "test-state");

    User user = new User();
    user.setId(1L);
    user.setEmail("test@example.com");

    when(authService.handleSpotifyCallback("test-code")).thenReturn(user);

    // Act & Assert
    mockMvc.perform(get("/api/auth/spotify/callback")
            .param("code", "test-code")
            .param("state", "test-state")
            .session(session))
        .andExpect(status().isFound())
        .andExpect(header().string("Location", "http://127.0.0.1:5173/"));

    verify(authService).handleSpotifyCallback("test-code");

    // Verify session contains userId
    assertThat(session.getAttribute("userId")).isEqualTo(1L);
}
```

Add import to `AuthControllerTest.java`:
```java
import static org.assertj.core.api.Assertions.assertThat;
```

**Step 3: Run all AuthController tests**

Run: `cd spotease-backend && ./mvnw test -Dtest=AuthControllerTest -q`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/controller/AuthController.java \
        spotease-backend/src/test/java/com/spotease/controller/AuthControllerTest.java
git commit -m "feat: set Spring Security authentication after OAuth callback"
```

---

## Task 6: Run full test suite and verify

**Step 1: Run all backend tests**

Run: `cd spotease-backend && ./mvnw test -q`
Expected: All tests PASS

**Step 2: Run the application and manually test**

Run: `cd spotease-backend && ./mvnw spring-boot:run`

Manual test checklist:
1. Navigate to frontend, click Spotify login
2. After OAuth redirect, check `/api/auth/status` returns correct `spotifyConnected` value
3. Verify `/api/playlists` no longer returns 401
4. Connect NetEase, verify `neteaseConnected` updates to `true`
5. Logout, verify all protected endpoints require re-authentication

**Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address any issues from integration testing"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `dto/AuthStatusResponse.java` | New DTO for auth status response |
| `SecurityConfig.java` | Add session management and security context config |
| `AuthController.java` | Set authentication after OAuth, update `/status` endpoint |
| `AuthService.java` | Add `getUserConnectionStatus()` method |
| `AuthServiceTest.java` | Add tests for `getUserConnectionStatus()` |
| `AuthControllerTest.java` | Add tests for updated `/status` endpoint |
