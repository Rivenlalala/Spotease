# Spotify SDK & NetEase API Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace WebClient-based implementations with production-ready Spotify SDK and NetEase API service integration.

**Architecture:** Use `se.michaelthelin.spotify:spotify-web-api-java:9.4.0` for Spotify integration and NetEase API service at `https://netease-api.rivenlalala.xyz` for NetEase Cloud Music integration. Both services handle authentication, playlist management, and track operations with proper error handling and retry logic.

**Tech Stack:**
- Spotify Web API Java SDK 9.4.0
- NetEase Cloud Music API (Node.js service)
- Spring WebClient (for NetEase HTTP calls)
- Jackson for JSON deserialization

---

## Task 1: Add Spotify SDK Dependency

**Files:**
- Modify: `pom.xml:24-73`

**Step 1: Add Spotify SDK dependency**

Add after line 73 (after spring-security-test):

```xml
        <!-- Spotify SDK -->
        <dependency>
            <groupId>se.michaelthelin.spotify</groupId>
            <artifactId>spotify-web-api-java</artifactId>
            <version>9.4.0</version>
        </dependency>
```

**Step 2: Update Maven dependencies**

Run: `./mvnw clean install -DskipTests`
Expected: SUCCESS with Spotify SDK downloaded

**Step 3: Commit**

```bash
git add pom.xml
git commit -m "build: add Spotify Web API Java SDK 9.4.0"
```

---

## Task 2: Configure NetEase API Base URL

**Files:**
- Modify: `src/main/resources/application.yml:19-26`

**Step 1: Add NetEase API configuration**

Add after line 25 (after spotify.redirect-uri):

```yaml
  netease:
    api-url: ${NETEASE_API_URL:https://netease-api.rivenlalala.xyz}
```

**Step 2: Verify configuration loads**

Run: `./mvnw spring-boot:run`
Check logs for: "spotease.netease.api-url" property loaded

**Step 3: Commit**

```bash
git add src/main/resources/application.yml
git commit -m "config: add NetEase API base URL configuration"
```

---

## Task 3: Create Spotify SDK Configuration

**Files:**
- Create: `src/main/java/com/spotease/config/SpotifyConfig.java`

**Step 1: Write the failing test**

Create: `src/test/java/com/spotease/config/SpotifyConfigTest.java`

```java
package com.spotease.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import se.michaelthelin.spotify.SpotifyApi;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = {
    "spotease.spotify.client-id=test-id",
    "spotease.spotify.client-secret=test-secret",
    "spotease.spotify.redirect-uri=http://localhost:8080/callback"
})
class SpotifyConfigTest {

    @Autowired
    private SpotifyApi spotifyApi;

    @Test
    void spotifyApiShouldBeConfigured() {
        assertThat(spotifyApi).isNotNull();
        assertThat(spotifyApi.getClientId()).isEqualTo("test-id");
        assertThat(spotifyApi.getClientSecret()).isEqualTo("test-secret");
        assertThat(spotifyApi.getRedirectURI().toString()).isEqualTo("http://localhost:8080/callback");
    }
}
```

**Step 2: Run test to verify it fails**

Run: `./mvnw test -Dtest=SpotifyConfigTest`
Expected: FAIL with "No qualifying bean of type 'se.michaelthelin.spotify.SpotifyApi'"

**Step 3: Write minimal implementation**

Create: `src/main/java/com/spotease/config/SpotifyConfig.java`

```java
package com.spotease.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import se.michaelthelin.spotify.SpotifyApi;

import java.net.URI;

@Configuration
public class SpotifyConfig {

  @Value("${spotease.spotify.client-id}")
  private String clientId;

  @Value("${spotease.spotify.client-secret}")
  private String clientSecret;

  @Value("${spotease.spotify.redirect-uri}")
  private String redirectUri;

  @Bean
  public SpotifyApi spotifyApi() {
    return new SpotifyApi.Builder()
        .setClientId(clientId)
        .setClientSecret(clientSecret)
        .setRedirectUri(URI.create(redirectUri))
        .build();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `./mvnw test -Dtest=SpotifyConfigTest`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/java/com/spotease/config/SpotifyConfig.java src/test/java/com/spotease/config/SpotifyConfigTest.java
git commit -m "feat: add Spotify SDK configuration with SpotifyApi bean"
```

---

## Task 4: Refactor AuthService to Use Spotify SDK

**Files:**
- Modify: `src/main/java/com/spotease/service/AuthService.java`

**Step 1: Update imports and inject SpotifyApi**

Replace lines 1-23:

```java
package com.spotease.service;

import com.spotease.model.User;
import com.spotease.repository.UserRepository;
import com.spotease.util.TokenEncryption;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import se.michaelthelin.spotify.SpotifyApi;
import se.michaelthelin.spotify.model_objects.credentials.AuthorizationCodeCredentials;
import se.michaelthelin.spotify.model_objects.specification.User as SpotifyUser;
import se.michaelthelin.spotify.requests.authorization.authorization_code.AuthorizationCodeRequest;
import se.michaelthelin.spotify.requests.authorization.authorization_code.AuthorizationCodeUriRequest;
import se.michaelthelin.spotify.requests.data.users_profile.GetCurrentUsersProfileRequest;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

  private final UserRepository userRepository;
  private final TokenEncryption tokenEncryption;
  private final SpotifyApi spotifyApi;
```

**Step 2: Refactor getSpotifyAuthUrl using SDK**

Replace method at lines 42-51:

```java
  public String getSpotifyAuthUrl(String state) {
    AuthorizationCodeUriRequest authorizationCodeUriRequest = spotifyApi.authorizationCodeUri()
        .scope("user-read-email,playlist-read-private,playlist-read-collaborative,playlist-modify-public,playlist-modify-private")
        .state(state)
        .build();

    return authorizationCodeUriRequest.execute().toString();
  }
```

**Step 3: Refactor handleSpotifyCallback using SDK**

Replace method at lines 53-71:

```java
  public User handleSpotifyCallback(String code) {
    try {
      // Exchange code for tokens
      AuthorizationCodeCredentials credentials = exchangeCodeForToken(code);

      // Create temporary API instance with access token
      SpotifyApi authenticatedApi = new SpotifyApi.Builder()
          .setAccessToken(credentials.getAccessToken())
          .build();

      // Get user profile
      SpotifyUser profile = getSpotifyUserProfile(authenticatedApi);

      // Create or update user
      User user = userRepository.findBySpotifyUserId(profile.getId())
          .orElse(new User());

      user.setSpotifyUserId(profile.getId());
      user.setEmail(profile.getEmail());
      user.setSpotifyAccessToken(tokenEncryption.encrypt(credentials.getAccessToken()));
      user.setSpotifyRefreshToken(tokenEncryption.encrypt(credentials.getRefreshToken()));
      user.setSpotifyTokenExpiry(LocalDateTime.now().plusSeconds(credentials.getExpiresIn()));

      return userRepository.save(user);
    } catch (Exception e) {
      log.error("Error handling Spotify callback", e);
      throw new RuntimeException("Error handling Spotify callback", e);
    }
  }
```

**Step 4: Refactor exchangeCodeForToken using SDK**

Replace method at lines 73-98:

```java
  private AuthorizationCodeCredentials exchangeCodeForToken(String code) {
    try {
      AuthorizationCodeRequest authorizationCodeRequest = spotifyApi.authorizationCode(code)
          .build();

      return authorizationCodeRequest.execute();
    } catch (Exception e) {
      log.error("Failed to exchange authorization code for token: {}", e.getMessage());
      throw new RuntimeException("Failed to exchange authorization code for access token", e);
    }
  }
```

**Step 5: Refactor getSpotifyUserProfile using SDK**

Replace method at lines 100-118:

```java
  private SpotifyUser getSpotifyUserProfile(SpotifyApi authenticatedApi) {
    try {
      GetCurrentUsersProfileRequest getCurrentUsersProfile = authenticatedApi.getCurrentUsersProfile()
          .build();

      return getCurrentUsersProfile.execute();
    } catch (Exception e) {
      log.error("Failed to fetch Spotify user profile: {}", e.getMessage());
      throw new RuntimeException("Failed to fetch Spotify user profile", e);
    }
  }
```

**Step 6: Verify compilation**

Run: `./mvnw compile`
Expected: SUCCESS

**Step 7: Commit**

```bash
git add src/main/java/com/spotease/service/AuthService.java
git commit -m "refactor: migrate AuthService to use Spotify SDK"
```

---

## Task 5: Refactor SpotifyService to Use Spotify SDK

**Files:**
- Modify: `src/main/java/com/spotease/service/SpotifyService.java`

**Step 1: Update imports and inject SpotifyApi**

Replace lines 1-24:

```java
package com.spotease.service;

import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.dto.spotify.SpotifyTrack;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import se.michaelthelin.spotify.SpotifyApi;
import se.michaelthelin.spotify.model_objects.specification.Paging;
import se.michaelthelin.spotify.model_objects.specification.PlaylistSimplified;
import se.michaelthelin.spotify.model_objects.specification.PlaylistTrack;
import se.michaelthelin.spotify.model_objects.specification.Track;
import se.michaelthelin.spotify.requests.data.playlists.AddItemsToPlaylistRequest;
import se.michaelthelin.spotify.requests.data.playlists.GetListOfCurrentUsersPlaylistsRequest;
import se.michaelthelin.spotify.requests.data.playlists.GetPlaylistsItemsRequest;
import se.michaelthelin.spotify.requests.data.search.simplified.SearchTracksRequest;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SpotifyService {

  private final SpotifyApi spotifyApi;
```

**Step 2: Implement getPlaylists using SDK**

Replace method at lines 26-30:

```java
  public List<SpotifyPlaylist> getPlaylists(String accessToken) {
    try {
      SpotifyApi authenticatedApi = createAuthenticatedApi(accessToken);

      GetListOfCurrentUsersPlaylistsRequest getPlaylistsRequest = authenticatedApi
          .getListOfCurrentUsersPlaylists()
          .limit(50)
          .build();

      Paging<PlaylistSimplified> playlistPaging = getPlaylistsRequest.execute();

      return Arrays.stream(playlistPaging.getItems())
          .map(this::mapToSpotifyPlaylist)
          .collect(Collectors.toList());
    } catch (Exception e) {
      throw new RuntimeException("Failed to get Spotify playlists", e);
    }
  }
```

**Step 3: Implement getPlaylistTracks using SDK**

Replace method at lines 32-36:

```java
  public List<SpotifyTrack> getPlaylistTracks(String accessToken, String playlistId) {
    try {
      SpotifyApi authenticatedApi = createAuthenticatedApi(accessToken);

      GetPlaylistsItemsRequest getPlaylistItemsRequest = authenticatedApi
          .getPlaylistsItems(playlistId)
          .limit(100)
          .build();

      Paging<PlaylistTrack> trackPaging = getPlaylistItemsRequest.execute();

      return Arrays.stream(trackPaging.getItems())
          .map(item -> (Track) item.getTrack())
          .filter(track -> track != null)
          .map(this::mapToSpotifyTrack)
          .collect(Collectors.toList());
    } catch (Exception e) {
      throw new RuntimeException("Failed to get playlist tracks", e);
    }
  }
```

**Step 4: Implement searchTrack using SDK**

Replace method at lines 38-42:

```java
  public List<SpotifyTrack> searchTrack(String accessToken, String query) {
    try {
      SpotifyApi authenticatedApi = createAuthenticatedApi(accessToken);

      SearchTracksRequest searchTracksRequest = authenticatedApi
          .searchTracks(query)
          .limit(10)
          .build();

      Paging<Track> trackPaging = searchTracksRequest.execute();

      return Arrays.stream(trackPaging.getItems())
          .map(this::mapToSpotifyTrack)
          .collect(Collectors.toList());
    } catch (Exception e) {
      throw new RuntimeException("Failed to search tracks", e);
    }
  }
```

**Step 5: Implement addTracksToPlaylist using SDK**

Replace method at lines 44-54:

```java
  public void addTracksToPlaylist(String accessToken, String playlistId, List<String> trackUris) {
    try {
      SpotifyApi authenticatedApi = createAuthenticatedApi(accessToken);

      AddItemsToPlaylistRequest addItemsRequest = authenticatedApi
          .addItemsToPlaylist(playlistId, trackUris.toArray(new String[0]))
          .build();

      addItemsRequest.execute();
    } catch (Exception e) {
      throw new RuntimeException("Failed to add tracks to playlist", e);
    }
  }
```

**Step 6: Add helper methods**

Add at end of class (after line 54):

```java
  private SpotifyApi createAuthenticatedApi(String accessToken) {
    return new SpotifyApi.Builder()
        .setAccessToken(accessToken)
        .build();
  }

  private SpotifyPlaylist mapToSpotifyPlaylist(PlaylistSimplified playlist) {
    SpotifyPlaylist dto = new SpotifyPlaylist();
    dto.setId(playlist.getId());
    dto.setName(playlist.getName());
    dto.setDescription(playlist.getDescription());
    dto.setTrackCount(playlist.getTracks().getTotal());
    return dto;
  }

  private SpotifyTrack mapToSpotifyTrack(Track track) {
    SpotifyTrack dto = new SpotifyTrack();
    dto.setId(track.getId());
    dto.setName(track.getName());
    dto.setArtists(Arrays.stream(track.getArtists())
        .map(se.michaelthelin.spotify.model_objects.specification.ArtistSimplified::getName)
        .collect(Collectors.toList()));
    dto.setAlbum(track.getAlbum().getName());
    dto.setDurationMs(track.getDurationMs());
    dto.setIsrc(track.getExternalIds() != null ?
        track.getExternalIds().get("isrc") : null);
    return dto;
  }
```

**Step 7: Verify compilation**

Run: `./mvnw compile`
Expected: SUCCESS

**Step 8: Commit**

```bash
git add src/main/java/com/spotease/service/SpotifyService.java
git commit -m "refactor: migrate SpotifyService to use Spotify SDK"
```

---

## Task 6: Update NetEase DTOs Based on API Response

**Files:**
- Modify: `src/main/java/com/spotease/dto/netease/NeteasePlaylist.java`
- Modify: `src/main/java/com/spotease/dto/netease/NeteaseTrack.java`
- Create: `src/main/java/com/spotease/dto/netease/NeteaseUserProfile.java`

**Step 1: Update NeteasePlaylist DTO**

Replace `src/main/java/com/spotease/dto/netease/NeteasePlaylist.java`:

```java
package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteasePlaylist {
  private String id;
  private String name;
  private String description;
  private Integer trackCount;
  private String coverImgUrl;
  private Long userId;
}
```

**Step 2: Update NeteaseTrack DTO**

Replace `src/main/java/com/spotease/dto/netease/NeteaseTrack.java`:

```java
package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteaseTrack {
  private String id;
  private String name;

  @JsonProperty("ar")
  private List<NeteaseArtist> artists;

  @JsonProperty("al")
  private NeteaseAlbum album;

  @JsonProperty("dt")
  private Integer duration;  // in milliseconds

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class NeteaseArtist {
    private String id;
    private String name;
  }

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class NeteaseAlbum {
    private String id;
    private String name;
    private String picUrl;
  }
}
```

**Step 3: Create NeteaseUserProfile DTO**

Create `src/main/java/com/spotease/dto/netease/NeteaseUserProfile.java`:

```java
package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteaseUserProfile {
  private Long userId;
  private String nickname;
  private String avatarUrl;
  private String signature;
}
```

**Step 4: Verify compilation**

Run: `./mvnw compile`
Expected: SUCCESS

**Step 5: Commit**

```bash
git add src/main/java/com/spotease/dto/netease/
git commit -m "refactor: update NetEase DTOs to match actual API response schemas"
```

---

## Task 7: Create NetEase API Response Wrapper DTOs

**Files:**
- Create: `src/main/java/com/spotease/dto/netease/NeteaseResponse.java`

**Step 1: Create generic response wrapper**

Create `src/main/java/com/spotease/dto/netease/NeteaseResponse.java`:

```java
package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteaseResponse<T> {
  private Integer code;
  private String message;
  private T data;

  // For account endpoint
  private NeteaseAccount account;
  private NeteaseUserProfile profile;

  // For playlist list endpoint
  private List<NeteasePlaylist> playlist;

  // For search endpoint
  private NeteaseSearchResult result;

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class NeteaseAccount {
    private Long id;
    private String userName;
  }

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class NeteasePlaylistWrapper {
    private NeteasePlaylistDetail playlist;
  }

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class NeteasePlaylistDetail extends NeteasePlaylist {
    private List<NeteaseTrack> tracks;
  }

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class NeteaseSearchResult {
    private List<NeteaseTrack> songs;
    private Integer songCount;
  }
}
```

**Step 2: Verify compilation**

Run: `./mvnw compile`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add src/main/java/com/spotease/dto/netease/NeteaseResponse.java
git commit -m "feat: add NetEase API response wrapper DTOs"
```

---

## Task 8: Implement NeteaseService with API Integration

**Files:**
- Modify: `src/main/java/com/spotease/service/NeteaseService.java`

**Step 1: Update imports and inject configuration**

Replace lines 1-22:

```java
package com.spotease.service;

import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.dto.netease.NeteaseResponse;
import com.spotease.dto.netease.NeteaseTrack;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NeteaseService {

  private final WebClient.Builder webClientBuilder;

  @Value("${spotease.netease.api-url}")
  private String neteaseApiUrl;

  private WebClient getWebClient(String cookie) {
    return webClientBuilder
        .baseUrl(neteaseApiUrl)
        .defaultHeader("Cookie", "MUSIC_U=" + cookie)
        .build();
  }
```

**Step 2: Implement getPlaylists**

Replace method at lines 24-27:

```java
  public List<NeteasePlaylist> getPlaylists(String cookie) {
    try {
      // Get user account to get userId
      NeteaseResponse<Void> accountResponse = getWebClient(cookie)
          .get()
          .uri("/user/account")
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<Void>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      Long userId = accountResponse.getProfile().getUserId();

      // Get user playlists
      NeteaseResponse<Void> playlistResponse = getWebClient(cookie)
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/user/playlist")
              .queryParam("uid", userId)
              .queryParam("limit", 100)
              .build())
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<Void>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      return playlistResponse.getPlaylist();
    } catch (Exception e) {
      throw new RuntimeException("Failed to get NetEase playlists", e);
    }
  }
```

**Step 3: Implement getPlaylistTracks**

Replace method at lines 29-32:

```java
  public List<NeteaseTrack> getPlaylistTracks(String cookie, String playlistId) {
    try {
      NeteaseResponse<NeteaseResponse.NeteasePlaylistWrapper> response = getWebClient(cookie)
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/playlist/detail")
              .queryParam("id", playlistId)
              .build())
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<NeteaseResponse.NeteasePlaylistWrapper>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      // Response has {playlist: {tracks: [...]}}
      return response.getData() != null && response.getData().getPlaylist() != null
          ? response.getData().getPlaylist().getTracks()
          : List.of();
    } catch (Exception e) {
      throw new RuntimeException("Failed to get playlist tracks", e);
    }
  }
```

**Step 4: Implement searchTrack**

Replace method at lines 34-37:

```java
  public List<NeteaseTrack> searchTrack(String cookie, String query) {
    try {
      NeteaseResponse<Void> response = getWebClient(cookie)
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/cloudsearch")
              .queryParam("keywords", query)
              .queryParam("type", 1)  // 1 = single track
              .queryParam("limit", 10)
              .build())
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<Void>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      return response.getResult() != null ? response.getResult().getSongs() : List.of();
    } catch (Exception e) {
      throw new RuntimeException("Failed to search tracks", e);
    }
  }
```

**Step 5: Implement addTracksToPlaylist**

Replace method at lines 39-42:

```java
  public void addTracksToPlaylist(String cookie, String playlistId, List<String> trackIds) {
    try {
      String trackIdsParam = String.join(",", trackIds);

      getWebClient(cookie)
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/playlist/tracks")
              .queryParam("op", "add")
              .queryParam("pid", playlistId)
              .queryParam("tracks", trackIdsParam)
              .build())
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<Void>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();
    } catch (Exception e) {
      throw new RuntimeException("Failed to add tracks to playlist", e);
    }
  }
```

**Step 6: Verify compilation**

Run: `./mvnw compile`
Expected: SUCCESS

**Step 7: Commit**

```bash
git add src/main/java/com/spotease/service/NeteaseService.java
git commit -m "feat: implement NeteaseService with API integration"
```

---

## Task 9: Remove Unused WebClient.Builder from SecurityConfig

**Files:**
- Modify: `src/main/java/com/spotease/config/SecurityConfig.java`

**Step 1: Remove WebClient.Builder bean**

This bean is no longer needed since SpotifyService and AuthService now use SpotifyApi.
NeteaseService injects WebClient.Builder directly, so it will use the default one.

Remove lines 42-45 from `src/main/java/com/spotease/config/SecurityConfig.java`:

```java
  @Bean
  public WebClient.Builder webClientBuilder() {
    return WebClient.builder();
  }
```

**Step 2: Verify compilation**

Run: `./mvnw compile`
Expected: SUCCESS

**Step 3: Verify application starts**

Run: `./mvnw spring-boot:run`
Expected: Application starts successfully

**Step 4: Commit**

```bash
git add src/main/java/com/spotease/config/SecurityConfig.java
git commit -m "refactor: remove unused WebClient.Builder bean from SecurityConfig"
```

---

## Task 10: Add Unit Tests for SpotifyService

**Files:**
- Create: `src/test/java/com/spotease/service/SpotifyServiceTest.java`

**Step 1: Write the failing test**

Create `src/test/java/com/spotease/service/SpotifyServiceTest.java`:

```java
package com.spotease.service;

import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.dto.spotify.SpotifyTrack;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import se.michaelthelin.spotify.SpotifyApi;
import se.michaelthelin.spotify.model_objects.specification.*;
import se.michaelthelin.spotify.requests.data.playlists.GetListOfCurrentUsersPlaylistsRequest;
import se.michaelthelin.spotify.requests.data.playlists.GetPlaylistsItemsRequest;
import se.michaelthelin.spotify.requests.data.search.simplified.SearchTracksRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SpotifyServiceTest {

  @Mock
  private SpotifyApi spotifyApi;

  @InjectMocks
  private SpotifyService spotifyService;

  @Test
  void shouldGetPlaylists() throws Exception {
    // Given
    PlaylistSimplified mockPlaylist = mock(PlaylistSimplified.class);
    when(mockPlaylist.getId()).thenReturn("playlist123");
    when(mockPlaylist.getName()).thenReturn("Test Playlist");
    when(mockPlaylist.getDescription()).thenReturn("Description");

    PlaylistSimplified.Builder.JsonObject mockTracks = mock(PlaylistSimplified.Builder.JsonObject.class);
    when(mockTracks.getTotal()).thenReturn(10);
    when(mockPlaylist.getTracks()).thenReturn(mockTracks);

    Paging<PlaylistSimplified> mockPaging = mock(Paging.class);
    when(mockPaging.getItems()).thenReturn(new PlaylistSimplified[]{mockPlaylist});

    GetListOfCurrentUsersPlaylistsRequest mockRequest = mock(GetListOfCurrentUsersPlaylistsRequest.class);
    when(mockRequest.execute()).thenReturn(mockPaging);

    GetListOfCurrentUsersPlaylistsRequest.Builder mockBuilder = mock(GetListOfCurrentUsersPlaylistsRequest.Builder.class);
    when(mockBuilder.limit(50)).thenReturn(mockBuilder);
    when(mockBuilder.build()).thenReturn(mockRequest);

    when(spotifyApi.getListOfCurrentUsersPlaylists()).thenReturn(mockBuilder);

    // When
    List<SpotifyPlaylist> result = spotifyService.getPlaylists("test-token");

    // Then
    assertThat(result).hasSize(1);
    assertThat(result.get(0).getId()).isEqualTo("playlist123");
    assertThat(result.get(0).getName()).isEqualTo("Test Playlist");
    assertThat(result.get(0).getTrackCount()).isEqualTo(10);
  }

  @Test
  void shouldSearchTracks() throws Exception {
    // Given
    Track mockTrack = mock(Track.class);
    when(mockTrack.getId()).thenReturn("track123");
    when(mockTrack.getName()).thenReturn("Test Track");
    when(mockTrack.getDurationMs()).thenReturn(180000);

    ArtistSimplified mockArtist = mock(ArtistSimplified.class);
    when(mockArtist.getName()).thenReturn("Test Artist");
    when(mockTrack.getArtists()).thenReturn(new ArtistSimplified[]{mockArtist});

    AlbumSimplified mockAlbum = mock(AlbumSimplified.class);
    when(mockAlbum.getName()).thenReturn("Test Album");
    when(mockTrack.getAlbum()).thenReturn(mockAlbum);

    Paging<Track> mockPaging = mock(Paging.class);
    when(mockPaging.getItems()).thenReturn(new Track[]{mockTrack});

    SearchTracksRequest mockRequest = mock(SearchTracksRequest.class);
    when(mockRequest.execute()).thenReturn(mockPaging);

    SearchTracksRequest.Builder mockBuilder = mock(SearchTracksRequest.Builder.class);
    when(mockBuilder.limit(10)).thenReturn(mockBuilder);
    when(mockBuilder.build()).thenReturn(mockRequest);

    when(spotifyApi.searchTracks(anyString())).thenReturn(mockBuilder);

    // When
    List<SpotifyTrack> result = spotifyService.searchTrack("test-token", "test query");

    // Then
    assertThat(result).hasSize(1);
    assertThat(result.get(0).getId()).isEqualTo("track123");
    assertThat(result.get(0).getName()).isEqualTo("Test Track");
    assertThat(result.get(0).getArtists()).containsExactly("Test Artist");
  }
}
```

**Step 2: Run test to verify it fails**

Run: `./mvnw test -Dtest=SpotifyServiceTest`
Expected: FAIL (SpotifyService not yet implemented)

**Step 3: Run test after implementation**

Run: `./mvnw test -Dtest=SpotifyServiceTest`
Expected: PASS

**Step 4: Commit**

```bash
git add src/test/java/com/spotease/service/SpotifyServiceTest.java
git commit -m "test: add unit tests for SpotifyService with mocked SDK"
```

---

## Task 11: Add Unit Tests for NeteaseService

**Files:**
- Create: `src/test/java/com/spotease/service/NeteaseServiceTest.java`

**Step 1: Write the failing test**

Create `src/test/java/com/spotease/service/NeteaseServiceTest.java`:

```java
package com.spotease.service;

import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.dto.netease.NeteaseResponse;
import com.spotease.dto.netease.NeteaseTrack;
import com.spotease.dto.netease.NeteaseUserProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NeteaseServiceTest {

  @Mock
  private WebClient.Builder webClientBuilder;

  @Mock
  private WebClient webClient;

  @Mock
  private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;

  @Mock
  private WebClient.RequestHeadersSpec requestHeadersSpec;

  @Mock
  private WebClient.ResponseSpec responseSpec;

  private NeteaseService neteaseService;

  @BeforeEach
  void setUp() {
    neteaseService = new NeteaseService(webClientBuilder);
    ReflectionTestUtils.setField(neteaseService, "neteaseApiUrl", "https://test-api.com");

    when(webClientBuilder.baseUrl(anyString())).thenReturn(webClientBuilder);
    when(webClientBuilder.defaultHeader(anyString(), anyString())).thenReturn(webClientBuilder);
    when(webClientBuilder.build()).thenReturn(webClient);
  }

  @Test
  void shouldGetPlaylists() {
    // Given
    NeteaseResponse<Void> accountResponse = new NeteaseResponse<>();
    NeteaseUserProfile profile = new NeteaseUserProfile();
    profile.setUserId(123L);
    accountResponse.setProfile(profile);

    NeteaseResponse<Void> playlistResponse = new NeteaseResponse<>();
    NeteasePlaylist playlist = new NeteasePlaylist();
    playlist.setId("456");
    playlist.setName("Test Playlist");
    playlistResponse.setPlaylist(List.of(playlist));

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersUriSpec.uri(any(java.util.function.Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(accountResponse))
        .thenReturn(Mono.just(playlistResponse));

    // When
    List<NeteasePlaylist> result = neteaseService.getPlaylists("test-cookie");

    // Then
    assertThat(result).hasSize(1);
    assertThat(result.get(0).getId()).isEqualTo("456");
    assertThat(result.get(0).getName()).isEqualTo("Test Playlist");
  }

  @Test
  void shouldSearchTracks() {
    // Given
    NeteaseResponse<Void> searchResponse = new NeteaseResponse<>();
    NeteaseResponse.NeteaseSearchResult searchResult = new NeteaseResponse.NeteaseSearchResult();

    NeteaseTrack track = new NeteaseTrack();
    track.setId("789");
    track.setName("Test Track");
    searchResult.setSongs(List.of(track));
    searchResponse.setResult(searchResult);

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(java.util.function.Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(searchResponse));

    // When
    List<NeteaseTrack> result = neteaseService.searchTrack("test-cookie", "test query");

    // Then
    assertThat(result).hasSize(1);
    assertThat(result.get(0).getId()).isEqualTo("789");
    assertThat(result.get(0).getName()).isEqualTo("Test Track");
  }
}
```

**Step 2: Run test to verify it fails**

Run: `./mvnw test -Dtest=NeteaseServiceTest`
Expected: FAIL (NeteaseService not yet implemented)

**Step 3: Run test after implementation**

Run: `./mvnw test -Dtest=NeteaseServiceTest`
Expected: PASS

**Step 4: Commit**

```bash
git add src/test/java/com/spotease/service/NeteaseServiceTest.java
git commit -m "test: add unit tests for NeteaseService with mocked WebClient"
```

---

## Task 12: Update README with SDK Information

**Files:**
- Modify: `README.md`

**Step 1: Update implementation status section**

Find the "## Current Implementation Status" section and update:

```markdown
## Current Implementation Status

**Completed:**
- ✅ PostgreSQL database setup with Docker
- ✅ JPA entities (User, ConversionJob, TrackMatch)
- ✅ Spring Data JPA repositories
- ✅ Token encryption utility (AES-256-GCM)
- ✅ Spring Security configuration
- ✅ Async task executor configuration
- ✅ **Spotify SDK integration** (spotify-web-api-java 9.4.0)
- ✅ **NetEase Cloud Music API integration** (https://netease-api.rivenlalala.xyz)
- ✅ Spotify OAuth authentication flow
- ✅ Health check endpoint

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
```

**Step 2: Add dependencies section**

Add after "## Tech Stack":

```markdown
## Key Dependencies

- **Spotify Web API Java SDK** 9.4.0 - Official Spotify API client
- **NetEase Cloud Music API** - Community API service (Node.js)
- Spring Boot 3.2.1
- PostgreSQL 15
- Spring Data JPA
- Spring Security
- Spring WebFlux (WebClient for NetEase API)
```

**Step 3: Update environment variables**

Update the environment variables section to clarify NetEase:

```markdown
3. **Update environment variables:**

```bash
# Required
export ENCRYPTION_KEY=your_32_character_encryption_key
export SPOTIFY_CLIENT_ID=your_spotify_client_id
export SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Optional (with defaults)
export DB_USERNAME=postgres
export DB_PASSWORD=postgres
export NETEASE_API_URL=https://netease-api.rivenlalala.xyz
```
```

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README with SDK integration details"
```

---

## Task 13: Run Full Test Suite

**Files:**
- None (verification task)

**Step 1: Run all tests**

Run: `./mvnw clean test`
Expected: All tests pass

**Step 2: Verify application starts**

Run: `./mvnw spring-boot:run`
Expected: Application starts on port 8080

**Step 3: Check health endpoint**

Run: `curl http://localhost:8080/api/health`
Expected: `{"status":"healthy"}`

**Step 4: Stop application**

Press Ctrl+C

**Step 5: Final commit if any fixes needed**

If fixes were needed:
```bash
git add .
git commit -m "fix: resolve issues found in final testing"
```

---

## Completion Checklist

- [ ] Spotify SDK dependency added to pom.xml
- [ ] NetEase API URL configured in application.yml
- [ ] SpotifyConfig created with SpotifyApi bean
- [ ] AuthService refactored to use Spotify SDK
- [ ] SpotifyService refactored to use Spotify SDK
- [ ] NetEase DTOs updated to match API schemas
- [ ] NetEase response wrapper DTOs created
- [ ] NeteaseService implemented with API integration
- [ ] Unused WebClient.Builder removed from SecurityConfig
- [ ] Unit tests added for SpotifyService (mocked SDK)
- [ ] Unit tests added for NeteaseService (mocked WebClient)
- [ ] README updated with SDK information
- [ ] All tests passing
- [ ] Application starts successfully

**Total Tasks:** 13
**Estimated Time:** Implementation tasks with TDD approach
