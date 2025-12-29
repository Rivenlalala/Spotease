# Backend Finalization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the remaining backend features: PlaylistController, NetEase QR authentication, and manual search endpoint.

**Architecture:** Add REST endpoints for playlist browsing and NetEase QR-based login flow. Implement cookie-based authentication with the NetEase API for QR code generation and status polling. Add manual search capability for reviewing uncertain track matches.

**Tech Stack:** Spring Boot 3.2+, Spring MVC, Mockito, JUnit 5, NetEase Cloud Music API

---

## Task 1: PlaylistController - Test Setup

**Files:**
- Create: `spotease-backend/src/test/java/com/spotease/controller/PlaylistControllerTest.java`

**Step 1: Write test setup boilerplate**

Create the test class with MockMvc setup:

```java
package com.spotease.controller;

import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.model.User;
import com.spotease.repository.UserRepository;
import com.spotease.service.NeteaseService;
import com.spotease.service.SpotifyService;
import com.spotease.util.TokenEncryption;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class PlaylistControllerTest {

  private MockMvc mockMvc;

  @Mock
  private SpotifyService spotifyService;

  @Mock
  private NeteaseService neteaseService;

  @Mock
  private UserRepository userRepository;

  @Mock
  private TokenEncryption tokenEncryption;

  @InjectMocks
  private PlaylistController playlistController;

  private MockHttpSession authenticatedSession;
  private User testUser;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(playlistController).build();

    authenticatedSession = new MockHttpSession();
    authenticatedSession.setAttribute("userId", 1L);

    testUser = new User();
    testUser.setId(1L);
    testUser.setEmail("test@example.com");
    testUser.setSpotifyUserId("spotify123");
    testUser.setSpotifyAccessToken("encrypted_spotify_token");
    testUser.setNeteaseUserId(456L);
    testUser.setNeteaseCookie("encrypted_netease_cookie");
  }
}
```

**Step 2: Run test to verify it compiles**

Run: `mvn test -Dtest=PlaylistControllerTest`
Expected: FAIL with "PlaylistController cannot be resolved" (controller doesn't exist yet)

**Step 3: Commit test setup**

```bash
git add spotease-backend/src/test/java/com/spotease/controller/PlaylistControllerTest.java
git commit -m "test: add PlaylistController test setup"
```

---

## Task 2: PlaylistController - Get Spotify Playlists Test

**Files:**
- Modify: `spotease-backend/src/test/java/com/spotease/controller/PlaylistControllerTest.java`

**Step 1: Write failing test for GET /api/playlists/spotify**

Add test method to PlaylistControllerTest:

```java
@Test
void testGetSpotifyPlaylists_Success() throws Exception {
  // Arrange
  SpotifyPlaylist playlist1 = new SpotifyPlaylist();
  playlist1.setId("playlist1");
  playlist1.setName("My Playlist");
  playlist1.setDescription("Test description");
  playlist1.setTrackCount(10);

  SpotifyPlaylist playlist2 = new SpotifyPlaylist();
  playlist2.setId("playlist2");
  playlist2.setName("Another Playlist");
  playlist2.setTrackCount(20);

  List<SpotifyPlaylist> playlists = Arrays.asList(playlist1, playlist2);

  when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
  when(tokenEncryption.decrypt("encrypted_spotify_token")).thenReturn("decrypted_token");
  when(spotifyService.getPlaylists("decrypted_token")).thenReturn(playlists);

  // Act & Assert
  mockMvc.perform(get("/api/playlists/spotify")
          .session(authenticatedSession))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(2)))
      .andExpect(jsonPath("$[0].id", is("playlist1")))
      .andExpect(jsonPath("$[0].name", is("My Playlist")))
      .andExpect(jsonPath("$[0].trackCount", is(10)))
      .andExpect(jsonPath("$[1].id", is("playlist2")))
      .andExpect(jsonPath("$[1].name", is("Another Playlist")));

  verify(userRepository).findById(1L);
  verify(tokenEncryption).decrypt("encrypted_spotify_token");
  verify(spotifyService).getPlaylists("decrypted_token");
}

@Test
void testGetSpotifyPlaylists_Unauthorized() throws Exception {
  // Act & Assert - no session
  mockMvc.perform(get("/api/playlists/spotify"))
      .andExpect(status().isUnauthorized());

  verifyNoInteractions(spotifyService);
}

@Test
void testGetSpotifyPlaylists_UserNotFound() throws Exception {
  // Arrange
  when(userRepository.findById(1L)).thenReturn(Optional.empty());

  // Act & Assert
  mockMvc.perform(get("/api/playlists/spotify")
          .session(authenticatedSession))
      .andExpect(status().isNotFound());

  verify(userRepository).findById(1L);
  verifyNoInteractions(tokenEncryption);
  verifyNoInteractions(spotifyService);
}
```

**Step 2: Run test to verify it fails**

Run: `mvn test -Dtest=PlaylistControllerTest#testGetSpotifyPlaylists_Success`
Expected: FAIL with "PlaylistController does not exist"

**Step 3: Commit the test**

```bash
git add spotease-backend/src/test/java/com/spotease/controller/PlaylistControllerTest.java
git commit -m "test: add GET /api/playlists/spotify tests"
```

---

## Task 3: PlaylistController - Create Controller Skeleton

**Files:**
- Create: `spotease-backend/src/main/java/com/spotease/controller/PlaylistController.java`

**Step 1: Create PlaylistController with Spotify playlists endpoint**

```java
package com.spotease.controller;

import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.model.User;
import com.spotease.repository.UserRepository;
import com.spotease.service.NeteaseService;
import com.spotease.service.SpotifyService;
import com.spotease.util.TokenEncryption;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/playlists")
@RequiredArgsConstructor
@Slf4j
public class PlaylistController {

  private final SpotifyService spotifyService;
  private final NeteaseService neteaseService;
  private final UserRepository userRepository;
  private final TokenEncryption tokenEncryption;

  @GetMapping("/spotify")
  public ResponseEntity<List<SpotifyPlaylist>> getSpotifyPlaylists(HttpSession session) {
    Long userId = getUserIdFromSession(session);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    log.info("Fetching Spotify playlists for user {}", userId);

    User user = userRepository.findById(userId).orElse(null);
    if (user == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    if (user.getSpotifyAccessToken() == null) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }

    try {
      String accessToken = tokenEncryption.decrypt(user.getSpotifyAccessToken());
      List<SpotifyPlaylist> playlists = spotifyService.getPlaylists(accessToken);
      return ResponseEntity.ok(playlists);
    } catch (Exception e) {
      log.error("Failed to fetch Spotify playlists for user {}: {}", userId, e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  private Long getUserIdFromSession(HttpSession session) {
    if (session == null) {
      return null;
    }
    Object userIdObj = session.getAttribute("userId");
    if (userIdObj instanceof Long) {
      return (Long) userIdObj;
    }
    return null;
  }
}
```

**Step 2: Run tests to verify they pass**

Run: `mvn test -Dtest=PlaylistControllerTest`
Expected: All 3 tests pass (success, unauthorized, user not found)

**Step 3: Commit the implementation**

```bash
git add spotease-backend/src/main/java/com/spotease/controller/PlaylistController.java
git commit -m "feat: add PlaylistController with GET /api/playlists/spotify endpoint"
```

---

## Task 4: PlaylistController - Get NetEase Playlists Test

**Files:**
- Modify: `spotease-backend/src/test/java/com/spotease/controller/PlaylistControllerTest.java`

**Step 1: Write test for GET /api/playlists/netease**

Add test method to PlaylistControllerTest:

```java
@Test
void testGetNeteasePlaylists_Success() throws Exception {
  // Arrange
  NeteasePlaylist playlist1 = new NeteasePlaylist();
  playlist1.setId("123");
  playlist1.setName("网易播放列表");
  playlist1.setDescription("测试描述");
  playlist1.setTrackCount(15);

  NeteasePlaylist playlist2 = new NeteasePlaylist();
  playlist2.setId("456");
  playlist2.setName("另一个播放列表");
  playlist2.setTrackCount(25);

  List<NeteasePlaylist> playlists = Arrays.asList(playlist1, playlist2);

  when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
  when(tokenEncryption.decrypt("encrypted_netease_cookie")).thenReturn("decrypted_cookie");
  when(neteaseService.getPlaylists("decrypted_cookie")).thenReturn(playlists);

  // Act & Assert
  mockMvc.perform(get("/api/playlists/netease")
          .session(authenticatedSession))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(2)))
      .andExpect(jsonPath("$[0].id", is("123")))
      .andExpect(jsonPath("$[0].name", is("网易播放列表")))
      .andExpect(jsonPath("$[0].trackCount", is(15)))
      .andExpect(jsonPath("$[1].id", is("456")));

  verify(userRepository).findById(1L);
  verify(tokenEncryption).decrypt("encrypted_netease_cookie");
  verify(neteaseService).getPlaylists("decrypted_cookie");
}

@Test
void testGetNeteasePlaylists_Unauthorized() throws Exception {
  // Act & Assert
  mockMvc.perform(get("/api/playlists/netease"))
      .andExpect(status().isUnauthorized());

  verifyNoInteractions(neteaseService);
}
```

**Step 2: Run test to verify it fails**

Run: `mvn test -Dtest=PlaylistControllerTest#testGetNeteasePlaylists_Success`
Expected: FAIL with 404 (endpoint doesn't exist yet)

**Step 3: Commit the test**

```bash
git add spotease-backend/src/test/java/com/spotease/controller/PlaylistControllerTest.java
git commit -m "test: add GET /api/playlists/netease tests"
```

---

## Task 5: PlaylistController - Implement NetEase Playlists Endpoint

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/controller/PlaylistController.java`

**Step 1: Add NetEase playlists endpoint**

Add this method after getSpotifyPlaylists():

```java
@GetMapping("/netease")
public ResponseEntity<List<NeteasePlaylist>> getNeteasePlaylists(HttpSession session) {
  Long userId = getUserIdFromSession(session);
  if (userId == null) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
  }

  log.info("Fetching NetEase playlists for user {}", userId);

  User user = userRepository.findById(userId).orElse(null);
  if (user == null) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
  }

  if (user.getNeteaseCookie() == null) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
  }

  try {
    String cookie = tokenEncryption.decrypt(user.getNeteaseCookie());
    List<NeteasePlaylist> playlists = neteaseService.getPlaylists(cookie);
    return ResponseEntity.ok(playlists);
  } catch (Exception e) {
    log.error("Failed to fetch NetEase playlists for user {}: {}", userId, e.getMessage(), e);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
  }
}
```

**Step 2: Run tests to verify they pass**

Run: `mvn test -Dtest=PlaylistControllerTest`
Expected: All tests pass

**Step 3: Commit the implementation**

```bash
git add spotease-backend/src/main/java/com/spotease/controller/PlaylistController.java
git commit -m "feat: add GET /api/playlists/netease endpoint"
```

---

## Task 6: PlaylistController - Get Playlist by Platform and ID Test

**Files:**
- Modify: `spotease-backend/src/test/java/com/spotease/controller/PlaylistControllerTest.java`

**Step 1: Write test for GET /api/playlists/{platform}/{id}**

Add test methods to PlaylistControllerTest:

```java
@Test
void testGetPlaylistById_Spotify_Success() throws Exception {
  // Arrange
  SpotifyPlaylist playlist = new SpotifyPlaylist();
  playlist.setId("playlist123");
  playlist.setName("Test Playlist");
  playlist.setDescription("Test description");
  playlist.setTrackCount(42);

  when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
  when(tokenEncryption.decrypt("encrypted_spotify_token")).thenReturn("decrypted_token");
  when(spotifyService.getPlaylistById("decrypted_token", "playlist123")).thenReturn(playlist);

  // Act & Assert
  mockMvc.perform(get("/api/playlists/spotify/playlist123")
          .session(authenticatedSession))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.id", is("playlist123")))
      .andExpect(jsonPath("$.name", is("Test Playlist")))
      .andExpect(jsonPath("$.trackCount", is(42)));

  verify(spotifyService).getPlaylistById("decrypted_token", "playlist123");
}

@Test
void testGetPlaylistById_Netease_Success() throws Exception {
  // Arrange
  NeteasePlaylist playlist = new NeteasePlaylist();
  playlist.setId("789");
  playlist.setName("网易歌单");
  playlist.setTrackCount(30);

  when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
  when(tokenEncryption.decrypt("encrypted_netease_cookie")).thenReturn("decrypted_cookie");
  when(neteaseService.getPlaylistById("decrypted_cookie", "789")).thenReturn(playlist);

  // Act & Assert
  mockMvc.perform(get("/api/playlists/netease/789")
          .session(authenticatedSession))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.id", is("789")))
      .andExpect(jsonPath("$.name", is("网易歌单")))
      .andExpect(jsonPath("$.trackCount", is(30)));

  verify(neteaseService).getPlaylistById("decrypted_cookie", "789");
}

@Test
void testGetPlaylistById_InvalidPlatform() throws Exception {
  // Act & Assert
  mockMvc.perform(get("/api/playlists/youtube/123")
          .session(authenticatedSession))
      .andExpect(status().isBadRequest());

  verifyNoInteractions(spotifyService);
  verifyNoInteractions(neteaseService);
}

@Test
void testGetPlaylistById_Unauthorized() throws Exception {
  // Act & Assert
  mockMvc.perform(get("/api/playlists/spotify/123"))
      .andExpect(status().isUnauthorized());
}
```

**Step 2: Run test to verify it fails**

Run: `mvn test -Dtest=PlaylistControllerTest#testGetPlaylistById_Spotify_Success`
Expected: FAIL with 404 (endpoint doesn't exist)

**Step 3: Commit the test**

```bash
git add spotease-backend/src/test/java/com/spotease/controller/PlaylistControllerTest.java
git commit -m "test: add GET /api/playlists/{platform}/{id} tests"
```

---

## Task 7: PlaylistController - Implement Get Playlist by ID

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/controller/PlaylistController.java`

**Step 1: Add get playlist by platform and ID endpoint**

Add this method after getNeteasePlaylists():

```java
@GetMapping("/{platform}/{playlistId}")
public ResponseEntity<?> getPlaylistById(
    @PathVariable String platform,
    @PathVariable String playlistId,
    HttpSession session) {

  Long userId = getUserIdFromSession(session);
  if (userId == null) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
  }

  // Validate platform
  if (!platform.equalsIgnoreCase("spotify") && !platform.equalsIgnoreCase("netease")) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
  }

  log.info("Fetching {} playlist {} for user {}", platform, playlistId, userId);

  User user = userRepository.findById(userId).orElse(null);
  if (user == null) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
  }

  try {
    if (platform.equalsIgnoreCase("spotify")) {
      if (user.getSpotifyAccessToken() == null) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
      }
      String accessToken = tokenEncryption.decrypt(user.getSpotifyAccessToken());
      SpotifyPlaylist playlist = spotifyService.getPlaylistById(accessToken, playlistId);
      return ResponseEntity.ok(playlist);

    } else { // netease
      if (user.getNeteaseCookie() == null) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
      }
      String cookie = tokenEncryption.decrypt(user.getNeteaseCookie());
      NeteasePlaylist playlist = neteaseService.getPlaylistById(cookie, playlistId);
      return ResponseEntity.ok(playlist);
    }
  } catch (Exception e) {
    log.error("Failed to fetch {} playlist {}: {}", platform, playlistId, e.getMessage(), e);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
  }
}
```

**Step 2: Run tests to verify they pass**

Run: `mvn test -Dtest=PlaylistControllerTest`
Expected: All tests pass

**Step 3: Commit the implementation**

```bash
git add spotease-backend/src/main/java/com/spotease/controller/PlaylistController.java
git commit -m "feat: add GET /api/playlists/{platform}/{id} endpoint"
```

---

## Task 8: NetEase QR Auth - Add DTOs

**Files:**
- Create: `spotease-backend/src/main/java/com/spotease/dto/netease/NeteaseQRKey.java`
- Create: `spotease-backend/src/main/java/com/spotease/dto/netease/NeteaseQRStatus.java`

**Step 1: Create NeteaseQRKey DTO**

```java
package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteaseQRKey {
  private Integer code;
  private NeteaseQRKeyData data;

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class NeteaseQRKeyData {
    private String unikey;
  }
}
```

**Step 2: Create NeteaseQRStatus DTO**

```java
package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteaseQRStatus {
  private Integer code;
  private String cookie;
  private String message;

  // Status code meanings:
  // 800 - QR code expired
  // 801 - Waiting for scan
  // 802 - Waiting for confirmation
  // 803 - Login successful
}
```

**Step 3: Verify compilation**

Run: `mvn compile`
Expected: SUCCESS

**Step 4: Commit the DTOs**

```bash
git add spotease-backend/src/main/java/com/spotease/dto/netease/NeteaseQRKey.java
git add spotease-backend/src/main/java/com/spotease/dto/netease/NeteaseQRStatus.java
git commit -m "feat: add NetEase QR authentication DTOs"
```

---

## Task 9: NetEase QR Auth - AuthService Methods Test

**Files:**
- Modify: `spotease-backend/src/test/java/com/spotease/service/AuthServiceTest.java` (if doesn't exist, create it)

**Step 1: Create AuthServiceTest with QR auth tests**

```java
package com.spotease.service;

import com.spotease.dto.netease.NeteaseQRKey;
import com.spotease.dto.netease.NeteaseQRStatus;
import com.spotease.dto.netease.NeteaseUserProfile;
import com.spotease.model.User;
import com.spotease.repository.UserRepository;
import com.spotease.util.TokenEncryption;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  @Mock
  private UserRepository userRepository;

  @Mock
  private TokenEncryption tokenEncryption;

  @Mock
  private WebClient webClient;

  @Mock
  private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;

  @Mock
  private WebClient.RequestHeadersSpec requestHeadersSpec;

  @Mock
  private WebClient.ResponseSpec responseSpec;

  @InjectMocks
  private AuthService authService;

  @Test
  void testGenerateNeteaseQRKey_Success() {
    // Arrange
    NeteaseQRKey qrKey = new NeteaseQRKey();
    qrKey.setCode(200);
    NeteaseQRKey.NeteaseQRKeyData data = new NeteaseQRKey.NeteaseQRKeyData();
    data.setUnikey("test-qr-key-123");
    qrKey.setData(data);

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(qrKey));

    // Act
    String result = authService.generateNeteaseQRKey();

    // Assert
    assertEquals("test-qr-key-123", result);
    verify(webClient).get();
  }

  @Test
  void testCheckNeteaseQRStatus_Waiting() {
    // Arrange
    NeteaseQRStatus status = new NeteaseQRStatus();
    status.setCode(801);
    status.setMessage("等待扫码");

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(status));

    // Act
    NeteaseQRStatus result = authService.checkNeteaseQRStatus("test-key");

    // Assert
    assertEquals(801, result.getCode());
    assertEquals("等待扫码", result.getMessage());
  }

  @Test
  void testCheckNeteaseQRStatus_Success() {
    // Arrange
    NeteaseQRStatus status = new NeteaseQRStatus();
    status.setCode(803);
    status.setCookie("MUSIC_U=test_cookie_value");
    status.setMessage("授权登录成功");

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(status));

    // Act
    NeteaseQRStatus result = authService.checkNeteaseQRStatus("test-key");

    // Assert
    assertEquals(803, result.getCode());
    assertNotNull(result.getCookie());
    assertTrue(result.getCookie().contains("MUSIC_U"));
  }
}
```

**Step 2: Run test to verify it fails**

Run: `mvn test -Dtest=AuthServiceTest`
Expected: FAIL (methods don't exist in AuthService yet)

**Step 3: Commit the test**

```bash
git add spotease-backend/src/test/java/com/spotease/service/AuthServiceTest.java
git commit -m "test: add NetEase QR authentication tests for AuthService"
```

---

## Task 10: NetEase QR Auth - Implement AuthService Methods

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/service/AuthService.java`

**Step 1: Add WebClient and NetEase API URL**

Add these fields to AuthService class (after existing fields):

```java
private final WebClient.Builder webClientBuilder;

@Value("${spotease.netease.api-url}")
private String neteaseApiUrl;

private WebClient neteaseWebClient;

@PostConstruct
public void initNeteaseClient() {
  this.neteaseWebClient = webClientBuilder
      .baseUrl(neteaseApiUrl)
      .build();
}
```

**Step 2: Add generateNeteaseQRKey method**

Add this method to AuthService:

```java
public String generateNeteaseQRKey() {
  try {
    NeteaseQRKey response = neteaseWebClient
        .get()
        .uri("/login/qr/key")
        .retrieve()
        .bodyToMono(new ParameterizedTypeReference<NeteaseQRKey>() {})
        .block();

    if (response == null || response.getCode() != 200 || response.getData() == null) {
      throw new RuntimeException("Failed to generate NetEase QR key");
    }

    return response.getData().getUnikey();
  } catch (Exception e) {
    log.error("Failed to generate NetEase QR key: {}", e.getMessage());
    throw new RuntimeException("Failed to generate NetEase QR key", e);
  }
}
```

**Step 3: Add checkNeteaseQRStatus method**

```java
public NeteaseQRStatus checkNeteaseQRStatus(String key) {
  try {
    NeteaseQRStatus response = neteaseWebClient
        .get()
        .uri(uriBuilder -> uriBuilder
            .path("/login/qr/check")
            .queryParam("key", key)
            .queryParam("timestamp", System.currentTimeMillis())
            .build())
        .retrieve()
        .bodyToMono(new ParameterizedTypeReference<NeteaseQRStatus>() {})
        .block();

    if (response == null) {
      throw new RuntimeException("Failed to check NetEase QR status");
    }

    return response;
  } catch (Exception e) {
    log.error("Failed to check NetEase QR status: {}", e.getMessage());
    throw new RuntimeException("Failed to check NetEase QR status", e);
  }
}
```

**Step 4: Add handleNeteaseQRLogin method**

```java
public User handleNeteaseQRLogin(Long userId, String cookie) {
  try {
    // Extract MUSIC_U cookie value
    String musicUValue = extractMusicUCookie(cookie);
    if (musicUValue == null) {
      throw new RuntimeException("Invalid NetEase cookie format");
    }

    // Get NetEase user profile
    NeteaseUserProfile profile = getNeteaseUserProfile(musicUValue);

    // Update user
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));

    user.setNeteaseUserId(profile.getUserId());
    user.setNeteaseCookie(tokenEncryption.encrypt(musicUValue));
    user.setNeteaseCookieExpiry(LocalDateTime.now().plusDays(30));

    return userRepository.save(user);
  } catch (Exception e) {
    log.error("Error handling NetEase QR login", e);
    throw new RuntimeException("Error handling NetEase QR login", e);
  }
}

private String extractMusicUCookie(String cookie) {
  if (cookie == null || !cookie.contains("MUSIC_U")) {
    return null;
  }

  // Cookie format: "MUSIC_U=value; other=value2"
  String[] parts = cookie.split(";");
  for (String part : parts) {
    part = part.trim();
    if (part.startsWith("MUSIC_U=")) {
      return part.substring(8); // Remove "MUSIC_U=" prefix
    }
  }
  return null;
}

private NeteaseUserProfile getNeteaseUserProfile(String cookie) {
  try {
    NeteaseResponse<Void> response = neteaseWebClient
        .get()
        .uri("/user/account")
        .header("Cookie", "MUSIC_U=" + cookie)
        .retrieve()
        .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<Void>>() {})
        .block();

    if (response == null || response.getCode() != 200 || response.getProfile() == null) {
      throw new RuntimeException("Failed to get NetEase user profile");
    }

    return response.getProfile();
  } catch (Exception e) {
    log.error("Failed to fetch NetEase user profile: {}", e.getMessage());
    throw new RuntimeException("Failed to fetch NetEase user profile", e);
  }
}
```

**Step 5: Add necessary imports**

Add to imports section:

```java
import com.spotease.dto.netease.NeteaseQRKey;
import com.spotease.dto.netease.NeteaseQRStatus;
import com.spotease.dto.netease.NeteaseResponse;
import com.spotease.dto.netease.NeteaseUserProfile;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.reactive.function.client.WebClient;
```

**Step 6: Run tests to verify they pass**

Run: `mvn test -Dtest=AuthServiceTest`
Expected: Tests pass (may need to adjust mocking setup)

**Step 7: Commit the implementation**

```bash
git add spotease-backend/src/main/java/com/spotease/service/AuthService.java
git commit -m "feat: implement NetEase QR authentication in AuthService"
```

---

## Task 11: NetEase QR Auth - Update AuthController Tests

**Files:**
- Create: `spotease-backend/src/test/java/com/spotease/controller/AuthControllerTest.java`

**Step 1: Create AuthController tests for QR endpoints**

```java
package com.spotease.controller;

import com.spotease.dto.netease.NeteaseQRStatus;
import com.spotease.model.User;
import com.spotease.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

  private MockMvc mockMvc;

  @Mock
  private AuthService authService;

  @InjectMocks
  private AuthController authController;

  private MockHttpSession authenticatedSession;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(authController).build();

    authenticatedSession = new MockHttpSession();
    authenticatedSession.setAttribute("userId", 1L);
  }

  @Test
  void testGenerateNeteaseQR_Success() throws Exception {
    // Arrange
    when(authService.generateNeteaseQRKey()).thenReturn("test-qr-key-abc123");

    // Act & Assert
    mockMvc.perform(post("/api/auth/netease/qr")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.qrKey", is("test-qr-key-abc123")))
        .andExpect(jsonPath("$.qrUrl", containsString("test-qr-key-abc123")));

    verify(authService).generateNeteaseQRKey();
  }

  @Test
  void testGenerateNeteaseQR_Unauthorized() throws Exception {
    // Act & Assert
    mockMvc.perform(post("/api/auth/netease/qr"))
        .andExpect(status().isUnauthorized());

    verifyNoInteractions(authService);
  }

  @Test
  void testCheckNeteaseQRStatus_Waiting() throws Exception {
    // Arrange
    NeteaseQRStatus status = new NeteaseQRStatus();
    status.setCode(801);
    status.setMessage("等待扫码");

    when(authService.checkNeteaseQRStatus("test-key")).thenReturn(status);

    // Act & Assert
    mockMvc.perform(get("/api/auth/netease/qr/status")
            .param("key", "test-key")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("WAITING")))
        .andExpect(jsonPath("$.message", is("等待扫码")));

    verify(authService).checkNeteaseQRStatus("test-key");
  }

  @Test
  void testCheckNeteaseQRStatus_Success() throws Exception {
    // Arrange
    NeteaseQRStatus status = new NeteaseQRStatus();
    status.setCode(803);
    status.setCookie("MUSIC_U=test_cookie_value");
    status.setMessage("授权登录成功");

    User user = new User();
    user.setId(1L);
    user.setNeteaseUserId(12345L);

    when(authService.checkNeteaseQRStatus("test-key")).thenReturn(status);
    when(authService.handleNeteaseQRLogin(1L, "MUSIC_U=test_cookie_value"))
        .thenReturn(user);

    // Act & Assert
    mockMvc.perform(get("/api/auth/netease/qr/status")
            .param("key", "test-key")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("SUCCESS")))
        .andExpect(jsonPath("$.message", is("授权登录成功")));

    verify(authService).checkNeteaseQRStatus("test-key");
    verify(authService).handleNeteaseQRLogin(1L, "MUSIC_U=test_cookie_value");
  }

  @Test
  void testCheckNeteaseQRStatus_Expired() throws Exception {
    // Arrange
    NeteaseQRStatus status = new NeteaseQRStatus();
    status.setCode(800);
    status.setMessage("二维码已过期");

    when(authService.checkNeteaseQRStatus("test-key")).thenReturn(status);

    // Act & Assert
    mockMvc.perform(get("/api/auth/netease/qr/status")
            .param("key", "test-key")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("EXPIRED")))
        .andExpect(jsonPath("$.message", is("二维码已过期")));

    verify(authService).checkNeteaseQRStatus("test-key");
    verify(authService, never()).handleNeteaseQRLogin(anyLong(), anyString());
  }

  @Test
  void testCheckNeteaseQRStatus_MissingKey() throws Exception {
    // Act & Assert
    mockMvc.perform(get("/api/auth/netease/qr/status")
            .session(authenticatedSession))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(authService);
  }
}
```

**Step 2: Run tests to verify they fail**

Run: `mvn test -Dtest=AuthControllerTest`
Expected: FAIL (endpoints not implemented yet)

**Step 3: Commit the test**

```bash
git add spotease-backend/src/test/java/com/spotease/controller/AuthControllerTest.java
git commit -m "test: add NetEase QR authentication endpoint tests"
```

---

## Task 12: NetEase QR Auth - Implement AuthController Endpoints

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/controller/AuthController.java`

**Step 1: Replace the TODO stubs with real implementations**

Replace the `generateNeteaseQR()` method (lines 93-101):

```java
@PostMapping("/netease/qr")
public ResponseEntity<?> generateNeteaseQR(HttpSession session) {
  Long userId = getUserIdFromSession(session);
  if (userId == null) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
  }

  try {
    String qrKey = authService.generateNeteaseQRKey();
    String qrUrl = "https://music.163.com/login?codekey=" + qrKey;

    return ResponseEntity.ok(Map.of(
        "qrKey", qrKey,
        "qrUrl", qrUrl
    ));
  } catch (Exception e) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("error", "Failed to generate QR code"));
  }
}

private Long getUserIdFromSession(HttpSession session) {
  if (session == null) {
    return null;
  }
  Object userIdObj = session.getAttribute("userId");
  if (userIdObj instanceof Long) {
    return (Long) userIdObj;
  }
  return null;
}
```

**Step 2: Replace the checkNeteaseQRStatus method (lines 103-110)**

```java
@GetMapping("/netease/qr/status")
public ResponseEntity<?> checkNeteaseQRStatus(
    @RequestParam(required = false) String key,
    HttpSession session) {

  Long userId = getUserIdFromSession(session);
  if (userId == null) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
  }

  if (key == null || key.trim().isEmpty()) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", "Missing QR key"));
  }

  try {
    NeteaseQRStatus qrStatus = authService.checkNeteaseQRStatus(key);

    // Map NetEase status code to readable status
    String status;
    switch (qrStatus.getCode()) {
      case 800:
        status = "EXPIRED";
        break;
      case 801:
        status = "WAITING";
        break;
      case 802:
        status = "SCANNED";
        break;
      case 803:
        status = "SUCCESS";
        // Handle successful login
        authService.handleNeteaseQRLogin(userId, qrStatus.getCookie());
        break;
      default:
        status = "UNKNOWN";
    }

    return ResponseEntity.ok(Map.of(
        "status", status,
        "message", qrStatus.getMessage() != null ? qrStatus.getMessage() : ""
    ));

  } catch (Exception e) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("error", "Failed to check QR status"));
  }
}
```

**Step 3: Add import for NeteaseQRStatus**

Add to imports:

```java
import com.spotease.dto.netease.NeteaseQRStatus;
import org.springframework.http.HttpStatus;
```

**Step 4: Run tests to verify they pass**

Run: `mvn test -Dtest=AuthControllerTest`
Expected: All tests pass

**Step 5: Commit the implementation**

```bash
git add spotease-backend/src/main/java/com/spotease/controller/AuthController.java
git commit -m "feat: implement NetEase QR authentication endpoints"
```

---

## Task 13: Manual Search Endpoint - Test

**Files:**
- Modify: `spotease-backend/src/test/java/com/spotease/controller/ReviewControllerTest.java`

**Step 1: Add manual search test**

Add these test methods to ReviewControllerTest:

```java
@Test
void testManualSearch_Spotify_Success() throws Exception {
  // Arrange
  User user = new User();
  user.setId(1L);
  user.setSpotifyAccessToken("encrypted_token");

  ConversionJob job = new ConversionJob();
  job.setId(1L);
  job.setUser(user);
  job.setDestinationPlatform(Platform.SPOTIFY);

  SpotifyTrack track1 = new SpotifyTrack();
  track1.setId("track1");
  track1.setName("Test Song");
  track1.setArtists(Arrays.asList("Artist 1"));

  SpotifyTrack track2 = new SpotifyTrack();
  track2.setId("track2");
  track2.setName("Another Song");
  track2.setArtists(Arrays.asList("Artist 2"));

  when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
  when(tokenEncryption.decrypt("encrypted_token")).thenReturn("decrypted_token");
  when(spotifyService.searchTrack("decrypted_token", "test query"))
      .thenReturn(Arrays.asList(track1, track2));

  // Act & Assert
  mockMvc.perform(get("/api/conversions/1/matches/search")
          .param("query", "test query")
          .session(authenticatedSession))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(2)))
      .andExpect(jsonPath("$[0].id", is("track1")))
      .andExpect(jsonPath("$[0].name", is("Test Song")))
      .andExpect(jsonPath("$[1].id", is("track2")));

  verify(spotifyService).searchTrack("decrypted_token", "test query");
}

@Test
void testManualSearch_Netease_Success() throws Exception {
  // Arrange
  User user = new User();
  user.setId(1L);
  user.setNeteaseCookie("encrypted_cookie");

  ConversionJob job = new ConversionJob();
  job.setId(1L);
  job.setUser(user);
  job.setDestinationPlatform(Platform.NETEASE);

  NeteaseTrack track1 = new NeteaseTrack();
  track1.setId("123");
  track1.setName("测试歌曲");

  when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
  when(tokenEncryption.decrypt("encrypted_cookie")).thenReturn("decrypted_cookie");
  when(neteaseService.searchTrack("decrypted_cookie", "测试"))
      .thenReturn(Arrays.asList(track1));

  // Act & Assert
  mockMvc.perform(get("/api/conversions/1/matches/search")
          .param("query", "测试")
          .session(authenticatedSession))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(1)))
      .andExpect(jsonPath("$[0].id", is("123")))
      .andExpect(jsonPath("$[0].name", is("测试歌曲")));

  verify(neteaseService).searchTrack("decrypted_cookie", "测试");
}

@Test
void testManualSearch_MissingQuery() throws Exception {
  // Act & Assert
  mockMvc.perform(get("/api/conversions/1/matches/search")
          .session(authenticatedSession))
      .andExpect(status().isBadRequest());
}

@Test
void testManualSearch_Unauthorized() throws Exception {
  // Act & Assert
  mockMvc.perform(get("/api/conversions/1/matches/search")
          .param("query", "test"))
      .andExpect(status().isUnauthorized());
}
```

**Step 2: Add imports**

Add to ReviewControllerTest imports:

```java
import com.spotease.dto.spotify.SpotifyTrack;
import com.spotease.dto.netease.NeteaseTrack;
```

**Step 3: Run test to verify it fails**

Run: `mvn test -Dtest=ReviewControllerTest#testManualSearch_Spotify_Success`
Expected: FAIL (endpoint doesn't exist)

**Step 4: Commit the test**

```bash
git add spotease-backend/src/test/java/com/spotease/controller/ReviewControllerTest.java
git commit -m "test: add manual search endpoint tests"
```

---

## Task 14: Manual Search Endpoint - Implementation

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/controller/ReviewController.java`

**Step 1: Add manual search endpoint**

Add this method to ReviewController after skipMatch():

```java
/**
 * Manual search for alternative tracks on destination platform
 */
@GetMapping("/search")
public ResponseEntity<?> manualSearch(
    @PathVariable Long jobId,
    @RequestParam(required = false) String query,
    HttpSession session) {

  Long userId = getUserIdFromSession(session);
  if (userId == null) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
  }

  if (query == null || query.trim().isEmpty()) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
  }

  log.info("Manual search for job {} with query: {}", jobId, query);

  try {
    // Fetch job
    ConversionJob job = jobRepository.findById(jobId).orElse(null);
    if (job == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    // Verify ownership
    if (!job.getUser().getId().equals(userId)) {
      log.warn("User {} attempted to search in job {} owned by user {}",
          userId, jobId, job.getUser().getId());
      return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    // Get user
    User user = job.getUser();

    // Search on destination platform
    Platform destPlatform = job.getDestinationPlatform();

    if (destPlatform == Platform.SPOTIFY) {
      String accessToken = tokenEncryption.decrypt(user.getSpotifyAccessToken());
      List<?> results = spotifyService.searchTrack(accessToken, query);
      return ResponseEntity.ok(results);

    } else if (destPlatform == Platform.NETEASE) {
      String cookie = tokenEncryption.decrypt(user.getNeteaseCookie());
      List<?> results = neteaseService.searchTrack(cookie, query);
      return ResponseEntity.ok(results);

    } else {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }

  } catch (IllegalArgumentException e) {
    log.error("Invalid request for manual search in job {}: {}", jobId, e.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
  } catch (Exception e) {
    log.error("Failed to perform manual search for job {}: {}", jobId, e.getMessage(), e);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
  }
}
```

**Step 2: Run tests to verify they pass**

Run: `mvn test -Dtest=ReviewControllerTest`
Expected: All tests pass including new manual search tests

**Step 3: Commit the implementation**

```bash
git add spotease-backend/src/main/java/com/spotease/controller/ReviewController.java
git commit -m "feat: add manual search endpoint for reviewing matches"
```

---

## Task 15: Integration Test - Full Workflow

**Files:**
- Create: `spotease-backend/src/test/java/com/spotease/integration/BackendIntegrationTest.java`

**Step 1: Create integration test**

```java
package com.spotease.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BackendIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void testHealthEndpoint() throws Exception {
    mockMvc.perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"));
  }

  @Test
  void testPlaylistEndpoints_RequireAuth() throws Exception {
    mockMvc.perform(get("/api/playlists/spotify"))
        .andExpect(status().isUnauthorized());

    mockMvc.perform(get("/api/playlists/netease"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void testAuthEndpoints_Accessible() throws Exception {
    mockMvc.perform(get("/api/auth/status"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.authenticated").value(false));
  }

  @Test
  void testConversionEndpoints_RequireAuth() throws Exception {
    mockMvc.perform(get("/api/conversions"))
        .andExpect(status().isUnauthorized());
  }
}
```

**Step 2: Run integration test**

Run: `mvn test -Dtest=BackendIntegrationTest`
Expected: All tests pass

**Step 3: Commit the integration test**

```bash
git add spotease-backend/src/test/java/com/spotease/integration/BackendIntegrationTest.java
git commit -m "test: add backend integration tests"
```

---

## Task 16: Update Backend README

**Files:**
- Modify: `spotease-backend/README.md`

**Step 1: Update the TODO section**

Replace the TODO section (lines 209-213) with:

```markdown
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
```

**Step 2: Add new endpoints to API Endpoints section**

Add after line 68:

```markdown
### Playlists
- `GET /api/playlists/spotify` - List user's Spotify playlists
- `GET /api/playlists/netease` - List user's NetEase playlists
- `GET /api/playlists/{platform}/{id}` - Get single playlist details

### Review (Manual Search)
- `GET /api/conversions/{jobId}/matches/search?query=...` - Search for alternative tracks
```

**Step 3: Update NetEase QR auth endpoint descriptions**

Update lines 65-66:

```markdown
- `POST /api/auth/netease/qr` - Generate NetEase QR code
- `GET /api/auth/netease/qr/status?key=...` - Check QR scan status
```

**Step 4: Run all tests to ensure everything works**

Run: `mvn clean test`
Expected: All tests pass

**Step 5: Commit the README update**

```bash
git add spotease-backend/README.md
git commit -m "docs: update README to reflect completed backend features"
```

---

## Task 17: Final Verification

**Files:**
- All backend files

**Step 1: Run complete test suite**

Run: `mvn clean test`
Expected: All tests pass

**Step 2: Build the application**

Run: `mvn clean package -DskipTests`
Expected: BUILD SUCCESS

**Step 3: Verify no compilation warnings**

Run: `mvn clean compile`
Expected: No errors or warnings

**Step 4: Create final commit**

```bash
git add -A
git commit -m "feat: complete backend implementation - PlaylistController, NetEase QR auth, manual search"
```

---

## Summary

This implementation plan adds three critical missing features to the Spotease backend:

1. **PlaylistController** - Enables browsing playlists from both Spotify and NetEase platforms
   - GET `/api/playlists/spotify` - List user's Spotify playlists
   - GET `/api/playlists/netease` - List user's NetEase playlists
   - GET `/api/playlists/{platform}/{id}` - Get individual playlist details

2. **NetEase QR Authentication** - Complete QR code login flow for NetEase Music
   - POST `/api/auth/netease/qr` - Generate QR key and URL
   - GET `/api/auth/netease/qr/status` - Poll QR scan status (WAITING, SCANNED, SUCCESS, EXPIRED)
   - Automatic user update with NetEase credentials on successful login

3. **Manual Search Endpoint** - Alternative track search during review phase
   - GET `/api/conversions/{jobId}/matches/search?query=...` - Search destination platform
   - Returns track results for user selection when auto-matching fails

All features include:
- Comprehensive unit tests using Mockito and JUnit 5
- Proper error handling and validation
- Session-based authentication checks
- Integration with existing services (SpotifyService, NeteaseService)
- Encrypted token storage

After completing this plan, the backend will be feature-complete according to the design document. The next phase is frontend integration and end-to-end testing.

---

**Total Tasks:** 17
**Estimated Time:** 2-3 hours (following TDD strictly)
**Testing Coverage:** Unit tests, integration tests, error cases
