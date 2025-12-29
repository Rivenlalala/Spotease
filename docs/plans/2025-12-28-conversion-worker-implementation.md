# Conversion Worker Implementation Plan

**Status:** ✅ COMPLETED

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the async conversion worker that processes playlist conversion jobs in the background, matching tracks between platforms and sending real-time WebSocket updates to the frontend.

**Architecture:** Spring @Async worker pattern with WebSocket (STOMP) for real-time updates. ConversionService orchestrates job creation and validation. ConversionWorker processes jobs asynchronously, using MatchingService for track matching, SpotifyService/NeteaseService for platform operations, and WebSocketService for progress updates. Jobs transition through states: QUEUED → PROCESSING → REVIEW_PENDING/COMPLETED.

> **Implementation Notes (2025-12-29):**
> - Uses `@TransactionalEventListener(phase = AFTER_COMMIT)` instead of direct @Async call to prevent race conditions
> - WebSocket sends to both `/topic/conversions` (general) and `/topic/conversions/{jobId}` (specific)
> - UPDATE mode checks existing tracks first (threshold: 0.30) before API search
> - See `spotease-backend/README.md` for current architecture details

**Tech Stack:** Spring Boot 3.2+, Spring WebSocket (STOMP), Spring @Async, Spring Data JPA, Lombok, JUnit 5, Mockito

---

## Task 1: Configure WebSocket with STOMP

**Files:**
- Create: `spotease-backend/src/main/java/com/spotease/config/WebSocketConfig.java`
- Modify: `spotease-backend/pom.xml` (verify spring-boot-starter-websocket is present)

**Step 1: Verify WebSocket dependency exists**

Check: `spotease-backend/pom.xml` should have:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

**Step 2: Create WebSocketConfig**

Create: `spotease-backend/src/main/java/com/spotease/config/WebSocketConfig.java`

```java
package com.spotease.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

  @Override
  public void configureMessageBroker(MessageBrokerRegistry config) {
    // Enable simple broker for topics
    config.enableSimpleBroker("/topic");
    // Prefix for messages FROM client TO server
    config.setApplicationDestinationPrefixes("/app");
  }

  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    // WebSocket endpoint: ws://localhost:8080/ws/conversions
    registry.addEndpoint("/ws/conversions")
        .setAllowedOrigins("http://localhost:5173", "http://localhost:3000")
        .withSockJS();
  }
}
```

**Step 3: Verify application starts with WebSocket**

Run: `cd spotease-backend && ./mvnw spring-boot:run`

Expected: Application starts successfully with logs mentioning "WebSocket" and "STOMP"

**Step 4: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/config/WebSocketConfig.java
git commit -m "feat: configure WebSocket with STOMP for real-time updates"
```

---

## Task 2: Create WebSocket Message DTOs

**Files:**
- Create: `spotease-backend/src/main/java/com/spotease/dto/WebSocketMessage.java`

**Step 1: Create WebSocketMessage DTO**

Create: `spotease-backend/src/main/java/com/spotease/dto/WebSocketMessage.java`

```java
package com.spotease.dto;

import com.spotease.model.JobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketMessage {
  private Long jobId;
  private JobStatus status;
  private Integer totalTracks;
  private Integer processedTracks;
  private Integer highConfidenceMatches;
  private Integer lowConfidenceMatches;
  private Integer failedTracks;
  private String errorMessage;
}
```

**Step 2: Verify compilation**

Run: `cd spotease-backend && ./mvnw compile`

Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/dto/WebSocketMessage.java
git commit -m "feat: add WebSocketMessage DTO for job updates"
```

---

## Task 3: Create WebSocketService

**Files:**
- Create: `spotease-backend/src/test/java/com/spotease/service/WebSocketServiceTest.java`
- Create: `spotease-backend/src/main/java/com/spotease/service/WebSocketService.java`

**Step 1: Write the failing test**

Create: `spotease-backend/src/test/java/com/spotease/service/WebSocketServiceTest.java`

```java
package com.spotease.service;

import com.spotease.dto.WebSocketMessage;
import com.spotease.model.ConversionJob;
import com.spotease.model.JobStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class WebSocketServiceTest {

  @Mock
  private SimpMessagingTemplate messagingTemplate;

  @InjectMocks
  private WebSocketService webSocketService;

  private ConversionJob job;

  @BeforeEach
  void setUp() {
    job = new ConversionJob();
    job.setId(1L);
    job.setStatus(JobStatus.PROCESSING);
    job.setTotalTracks(10);
    job.setProcessedTracks(5);
    job.setHighConfidenceMatches(3);
    job.setLowConfidenceMatches(1);
    job.setFailedTracks(1);
  }

  @Test
  void shouldSendJobUpdate() {
    // When
    webSocketService.sendJobUpdate(job);

    // Then
    ArgumentCaptor<WebSocketMessage> messageCaptor = ArgumentCaptor.forClass(WebSocketMessage.class);
    verify(messagingTemplate).convertAndSend(
        eq("/topic/conversions/" + job.getId()),
        messageCaptor.capture()
    );

    WebSocketMessage message = messageCaptor.getValue();
    assertThat(message.getJobId()).isEqualTo(1L);
    assertThat(message.getStatus()).isEqualTo(JobStatus.PROCESSING);
    assertThat(message.getTotalTracks()).isEqualTo(10);
    assertThat(message.getProcessedTracks()).isEqualTo(5);
    assertThat(message.getHighConfidenceMatches()).isEqualTo(3);
    assertThat(message.getLowConfidenceMatches()).isEqualTo(1);
    assertThat(message.getFailedTracks()).isEqualTo(1);
  }

  @Test
  void shouldSendJobComplete() {
    // When
    webSocketService.sendJobComplete(job);

    // Then
    ArgumentCaptor<WebSocketMessage> messageCaptor = ArgumentCaptor.forClass(WebSocketMessage.class);
    verify(messagingTemplate).convertAndSend(
        eq("/topic/conversions/" + job.getId()),
        messageCaptor.capture()
    );

    WebSocketMessage message = messageCaptor.getValue();
    assertThat(message.getJobId()).isEqualTo(1L);
    assertThat(message.getStatus()).isEqualTo(JobStatus.PROCESSING);
  }

  @Test
  void shouldSendJobError() {
    // When
    webSocketService.sendJobError(job, "Test error message");

    // Then
    ArgumentCaptor<WebSocketMessage> messageCaptor = ArgumentCaptor.forClass(WebSocketMessage.class);
    verify(messagingTemplate).convertAndSend(
        eq("/topic/conversions/" + job.getId()),
        messageCaptor.capture()
    );

    WebSocketMessage message = messageCaptor.getValue();
    assertThat(message.getJobId()).isEqualTo(1L);
    assertThat(message.getStatus()).isEqualTo(JobStatus.FAILED);
    assertThat(message.getErrorMessage()).isEqualTo("Test error message");
  }
}
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=WebSocketServiceTest`

Expected: FAIL with "cannot find symbol: class WebSocketService"

**Step 3: Write minimal implementation**

Create: `spotease-backend/src/main/java/com/spotease/service/WebSocketService.java`

```java
package com.spotease.service;

import com.spotease.dto.WebSocketMessage;
import com.spotease.model.ConversionJob;
import com.spotease.model.JobStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketService {

  private final SimpMessagingTemplate messagingTemplate;

  public void sendJobUpdate(ConversionJob job) {
    WebSocketMessage message = buildMessage(job);
    String destination = "/topic/conversions/" + job.getId();

    log.debug("Sending WebSocket update to {}: {}", destination, message);
    messagingTemplate.convertAndSend(destination, message);
  }

  public void sendJobComplete(ConversionJob job) {
    WebSocketMessage message = buildMessage(job);
    String destination = "/topic/conversions/" + job.getId();

    log.info("Sending job completion to {}", destination);
    messagingTemplate.convertAndSend(destination, message);
  }

  public void sendJobError(ConversionJob job, String errorMessage) {
    WebSocketMessage message = buildMessage(job);
    message.setStatus(JobStatus.FAILED);
    message.setErrorMessage(errorMessage);

    String destination = "/topic/conversions/" + job.getId();
    log.error("Sending job error to {}: {}", destination, errorMessage);
    messagingTemplate.convertAndSend(destination, message);
  }

  private WebSocketMessage buildMessage(ConversionJob job) {
    return WebSocketMessage.builder()
        .jobId(job.getId())
        .status(job.getStatus())
        .totalTracks(job.getTotalTracks())
        .processedTracks(job.getProcessedTracks())
        .highConfidenceMatches(job.getHighConfidenceMatches())
        .lowConfidenceMatches(job.getLowConfidenceMatches())
        .failedTracks(job.getFailedTracks())
        .build();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=WebSocketServiceTest`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/service/WebSocketService.java \
        spotease-backend/src/test/java/com/spotease/service/WebSocketServiceTest.java
git commit -m "feat: implement WebSocketService for real-time job updates"
```

---

## Task 4: Create Conversion Request/Response DTOs

**Files:**
- Create: `spotease-backend/src/main/java/com/spotease/dto/ConversionRequest.java`
- Create: `spotease-backend/src/main/java/com/spotease/dto/ConversionResponse.java`

**Step 1: Create ConversionRequest DTO**

Create: `spotease-backend/src/main/java/com/spotease/dto/ConversionRequest.java`

```java
package com.spotease.dto;

import com.spotease.model.ConversionMode;
import com.spotease.model.Platform;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionRequest {

  @NotNull(message = "Source platform is required")
  private Platform sourcePlatform;

  @NotNull(message = "Source playlist ID is required")
  private String sourcePlaylistId;

  @NotNull(message = "Conversion mode is required")
  private ConversionMode mode;

  // For CREATE mode: name of new playlist
  private String destinationPlaylistName;

  // For UPDATE mode: ID of existing playlist
  private String destinationPlaylistId;
}
```

**Step 2: Create ConversionResponse DTO**

Create: `spotease-backend/src/main/java/com/spotease/dto/ConversionResponse.java`

```java
package com.spotease.dto;

import com.spotease.model.JobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionResponse {
  private Long jobId;
  private JobStatus status;
  private String sourcePlaylistName;
  private String destinationPlaylistName;
  private Integer totalTracks;
  private Integer processedTracks;
  private Integer highConfidenceMatches;
  private Integer lowConfidenceMatches;
  private Integer failedTracks;
  private LocalDateTime createdAt;
  private LocalDateTime completedAt;
}
```

**Step 3: Verify compilation**

Run: `cd spotease-backend && ./mvnw compile`

Expected: BUILD SUCCESS

**Step 4: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/dto/ConversionRequest.java \
        spotease-backend/src/main/java/com/spotease/dto/ConversionResponse.java
git commit -m "feat: add conversion request/response DTOs"
```

---

## Task 5: Create ConversionService - Job Creation

**Files:**
- Create: `spotease-backend/src/test/java/com/spotease/service/ConversionServiceTest.java`
- Create: `spotease-backend/src/main/java/com/spotease/service/ConversionService.java`

**Step 1: Write the failing test for job creation**

Create: `spotease-backend/src/test/java/com/spotease/service/ConversionServiceTest.java`

```java
package com.spotease.service;

import com.spotease.dto.ConversionRequest;
import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.model.*;
import com.spotease.repository.ConversionJobRepository;
import com.spotease.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConversionServiceTest {

  @Mock
  private ConversionJobRepository jobRepository;

  @Mock
  private UserRepository userRepository;

  @Mock
  private SpotifyService spotifyService;

  @Mock
  private NeteaseService neteaseService;

  @InjectMocks
  private ConversionService conversionService;

  private User user;
  private ConversionRequest request;

  @BeforeEach
  void setUp() {
    user = new User();
    user.setId(1L);
    user.setSpotifyAccessToken("encrypted-spotify-token");
    user.setNeteaseCookie("encrypted-netease-cookie");

    request = ConversionRequest.builder()
        .sourcePlatform(Platform.SPOTIFY)
        .sourcePlaylistId("playlist123")
        .mode(ConversionMode.CREATE)
        .destinationPlaylistName("My Converted Playlist")
        .build();
  }

  @Test
  void shouldCreateJobForSpotifyToNeteaseConversion() {
    // Given
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    SpotifyPlaylist sourcePlaylist = new SpotifyPlaylist();
    sourcePlaylist.setId("playlist123");
    sourcePlaylist.setName("Source Playlist");
    sourcePlaylist.setTrackCount(10);
    when(spotifyService.getPlaylistById(any(), eq("playlist123")))
        .thenReturn(sourcePlaylist);

    ConversionJob savedJob = new ConversionJob();
    savedJob.setId(1L);
    when(jobRepository.save(any(ConversionJob.class))).thenReturn(savedJob);

    // When
    ConversionJob result = conversionService.createJob(1L, request);

    // Then
    assertThat(result).isNotNull();
    assertThat(result.getId()).isEqualTo(1L);

    ArgumentCaptor<ConversionJob> jobCaptor = ArgumentCaptor.forClass(ConversionJob.class);
    verify(jobRepository).save(jobCaptor.capture());

    ConversionJob capturedJob = jobCaptor.getValue();
    assertThat(capturedJob.getUser()).isEqualTo(user);
    assertThat(capturedJob.getSourcePlatform()).isEqualTo(Platform.SPOTIFY);
    assertThat(capturedJob.getSourcePlaylistId()).isEqualTo("playlist123");
    assertThat(capturedJob.getSourcePlaylistName()).isEqualTo("Source Playlist");
    assertThat(capturedJob.getDestinationPlatform()).isEqualTo(Platform.NETEASE);
    assertThat(capturedJob.getDestinationPlaylistName()).isEqualTo("My Converted Playlist");
    assertThat(capturedJob.getMode()).isEqualTo(ConversionMode.CREATE);
    assertThat(capturedJob.getStatus()).isEqualTo(JobStatus.QUEUED);
    assertThat(capturedJob.getTotalTracks()).isEqualTo(10);
  }

  @Test
  void shouldThrowExceptionWhenUserNotFound() {
    // Given
    when(userRepository.findById(1L)).thenReturn(Optional.empty());

    // When/Then
    assertThatThrownBy(() -> conversionService.createJob(1L, request))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("User not found");
  }

  @Test
  void shouldThrowExceptionWhenCreateModeWithoutPlaylistName() {
    // Given
    request.setDestinationPlaylistName(null);

    // When/Then
    assertThatThrownBy(() -> conversionService.createJob(1L, request))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("destination playlist name is required");
  }

  @Test
  void shouldThrowExceptionWhenUpdateModeWithoutPlaylistId() {
    // Given
    request.setMode(ConversionMode.UPDATE);
    request.setDestinationPlaylistId(null);

    // When/Then
    assertThatThrownBy(() -> conversionService.createJob(1L, request))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("destination playlist ID is required");
  }
}
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=ConversionServiceTest`

Expected: FAIL with "cannot find symbol: class ConversionService"

**Step 3: Write minimal implementation**

Create: `spotease-backend/src/main/java/com/spotease/service/ConversionService.java`

```java
package com.spotease.service;

import com.spotease.dto.ConversionRequest;
import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.model.*;
import com.spotease.repository.ConversionJobRepository;
import com.spotease.repository.UserRepository;
import com.spotease.util.TokenEncryption;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversionService {

  private final ConversionJobRepository jobRepository;
  private final UserRepository userRepository;
  private final SpotifyService spotifyService;
  private final NeteaseService neteaseService;
  private final TokenEncryption tokenEncryption;

  @Transactional
  public ConversionJob createJob(Long userId, ConversionRequest request) {
    log.info("Creating conversion job for user {}", userId);

    // Validate request
    validateRequest(request);

    // Load user
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found: " + userId));

    // Determine destination platform (opposite of source)
    Platform destinationPlatform = request.getSourcePlatform() == Platform.SPOTIFY
        ? Platform.NETEASE
        : Platform.SPOTIFY;

    // Get source playlist info
    String sourcePlaylistName;
    int totalTracks;

    if (request.getSourcePlatform() == Platform.SPOTIFY) {
      String accessToken = tokenEncryption.decrypt(user.getSpotifyAccessToken());
      SpotifyPlaylist playlist = spotifyService.getPlaylistById(accessToken, request.getSourcePlaylistId());
      sourcePlaylistName = playlist.getName();
      totalTracks = playlist.getTrackCount();
    } else {
      String cookie = tokenEncryption.decrypt(user.getNeteaseCookie());
      NeteasePlaylist playlist = neteaseService.getPlaylistById(cookie, request.getSourcePlaylistId());
      sourcePlaylistName = playlist.getName();
      totalTracks = playlist.getTrackCount();
    }

    // Create job
    ConversionJob job = new ConversionJob();
    job.setUser(user);
    job.setSourcePlatform(request.getSourcePlatform());
    job.setSourcePlaylistId(request.getSourcePlaylistId());
    job.setSourcePlaylistName(sourcePlaylistName);
    job.setDestinationPlatform(destinationPlatform);
    job.setMode(request.getMode());
    job.setStatus(JobStatus.QUEUED);
    job.setTotalTracks(totalTracks);
    job.setProcessedTracks(0);
    job.setHighConfidenceMatches(0);
    job.setLowConfidenceMatches(0);
    job.setFailedTracks(0);

    if (request.getMode() == ConversionMode.CREATE) {
      job.setDestinationPlaylistName(request.getDestinationPlaylistName());
    } else {
      job.setDestinationPlaylistId(request.getDestinationPlaylistId());
      // Get destination playlist name for display
      if (destinationPlatform == Platform.SPOTIFY) {
        String accessToken = tokenEncryption.decrypt(user.getSpotifyAccessToken());
        SpotifyPlaylist playlist = spotifyService.getPlaylistById(accessToken, request.getDestinationPlaylistId());
        job.setDestinationPlaylistName(playlist.getName());
      } else {
        String cookie = tokenEncryption.decrypt(user.getNeteaseCookie());
        NeteasePlaylist playlist = neteaseService.getPlaylistById(cookie, request.getDestinationPlaylistId());
        job.setDestinationPlaylistName(playlist.getName());
      }
    }

    ConversionJob savedJob = jobRepository.save(job);
    log.info("Created conversion job {}: {} → {}", savedJob.getId(), sourcePlaylistName, job.getDestinationPlaylistName());

    return savedJob;
  }

  private void validateRequest(ConversionRequest request) {
    if (request.getMode() == ConversionMode.CREATE) {
      if (request.getDestinationPlaylistName() == null || request.getDestinationPlaylistName().isBlank()) {
        throw new IllegalArgumentException("For CREATE mode, destination playlist name is required");
      }
    } else {
      if (request.getDestinationPlaylistId() == null || request.getDestinationPlaylistId().isBlank()) {
        throw new IllegalArgumentException("For UPDATE mode, destination playlist ID is required");
      }
    }
  }
}
```

**Step 4: Add getPlaylistById methods to services**

We need to add `getPlaylistById` methods to SpotifyService and NeteaseService. For now, update the test to use existing methods:

Modify test to use `getPlaylists()` and filter:

```java
// In test setup, mock getPlaylists instead
when(spotifyService.getPlaylists(any()))
    .thenReturn(List.of(sourcePlaylist));
```

And update ConversionService implementation to fetch all playlists and filter (temporary workaround):

```java
// Replace getPlaylistById calls with:
List<SpotifyPlaylist> playlists = spotifyService.getPlaylists(accessToken);
SpotifyPlaylist playlist = playlists.stream()
    .filter(p -> p.getId().equals(request.getSourcePlaylistId()))
    .findFirst()
    .orElseThrow(() -> new RuntimeException("Playlist not found"));
```

**Step 5: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=ConversionServiceTest#shouldCreateJobForSpotifyToNeteaseConversion`

Expected: PASS

**Step 6: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/service/ConversionService.java \
        spotease-backend/src/test/java/com/spotease/service/ConversionServiceTest.java
git commit -m "feat: implement ConversionService job creation with validation"
```

---

## Task 6: Create ConversionWorker - Basic Structure

**Files:**
- Create: `spotease-backend/src/test/java/com/spotease/worker/ConversionWorkerTest.java`
- Create: `spotease-backend/src/main/java/com/spotease/worker/ConversionWorker.java`

**Step 1: Write the failing test**

Create: `spotease-backend/src/test/java/com/spotease/worker/ConversionWorkerTest.java`

```java
package com.spotease.worker;

import com.spotease.dto.spotify.SpotifyTrack;
import com.spotease.model.*;
import com.spotease.repository.ConversionJobRepository;
import com.spotease.repository.TrackMatchRepository;
import com.spotease.service.*;
import com.spotease.util.TokenEncryption;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConversionWorkerTest {

  @Mock
  private ConversionJobRepository jobRepository;

  @Mock
  private TrackMatchRepository trackMatchRepository;

  @Mock
  private SpotifyService spotifyService;

  @Mock
  private NeteaseService neteaseService;

  @Mock
  private MatchingService matchingService;

  @Mock
  private WebSocketService webSocketService;

  @Mock
  private TokenEncryption tokenEncryption;

  @InjectMocks
  private ConversionWorker conversionWorker;

  private ConversionJob job;
  private User user;

  @BeforeEach
  void setUp() {
    user = new User();
    user.setId(1L);
    user.setSpotifyAccessToken("encrypted-token");
    user.setNeteaseCookie("encrypted-cookie");

    job = new ConversionJob();
    job.setId(1L);
    job.setUser(user);
    job.setSourcePlatform(Platform.SPOTIFY);
    job.setSourcePlaylistId("playlist123");
    job.setDestinationPlatform(Platform.NETEASE);
    job.setMode(ConversionMode.CREATE);
    job.setDestinationPlaylistName("New Playlist");
    job.setStatus(JobStatus.QUEUED);
    job.setTotalTracks(2);
  }

  @Test
  void shouldProcessJobWithAutoMatchedTracks() {
    // Given
    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(tokenEncryption.decrypt("encrypted-token")).thenReturn("decrypted-token");
    when(tokenEncryption.decrypt("encrypted-cookie")).thenReturn("decrypted-cookie");

    // Source tracks
    SpotifyTrack track1 = new SpotifyTrack();
    track1.setId("track1");
    track1.setName("Track 1");

    SpotifyTrack track2 = new SpotifyTrack();
    track2.setId("track2");
    track2.setName("Track 2");

    when(spotifyService.getPlaylistTracks(eq("decrypted-token"), eq("playlist123")))
        .thenReturn(List.of(track1, track2));

    // Both tracks auto-matched
    TrackMatch match1 = new TrackMatch();
    match1.setStatus(MatchStatus.AUTO_MATCHED);
    match1.setDestinationTrackId("netease-track1");
    match1.setMatchConfidence(0.95);

    TrackMatch match2 = new TrackMatch();
    match2.setStatus(MatchStatus.AUTO_MATCHED);
    match2.setDestinationTrackId("netease-track2");
    match2.setMatchConfidence(0.90);

    when(matchingService.findBestMatch(eq(track1), eq(Platform.NETEASE), eq("decrypted-cookie"), eq(job)))
        .thenReturn(match1);
    when(matchingService.findBestMatch(eq(track2), eq(Platform.NETEASE), eq("decrypted-cookie"), eq(job)))
        .thenReturn(match2);

    // When
    conversionWorker.processConversionJob(1L);

    // Then
    verify(jobRepository, atLeastOnce()).save(argThat(j ->
        j.getStatus() == JobStatus.PROCESSING
    ));
    verify(jobRepository, atLeastOnce()).save(argThat(j ->
        j.getStatus() == JobStatus.COMPLETED &&
        j.getProcessedTracks() == 2 &&
        j.getHighConfidenceMatches() == 2
    ));
    verify(trackMatchRepository, times(2)).save(any(TrackMatch.class));
    verify(neteaseService).createPlaylist(eq("decrypted-cookie"), eq("New Playlist"));
    verify(neteaseService).addTracksToPlaylist(eq("decrypted-cookie"), anyString(), anyList());
    verify(webSocketService, atLeast(2)).sendJobUpdate(any(ConversionJob.class));
    verify(webSocketService).sendJobComplete(any(ConversionJob.class));
  }

  @Test
  void shouldHandlePendingReviewTracks() {
    // Given
    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(tokenEncryption.decrypt("encrypted-token")).thenReturn("decrypted-token");
    when(tokenEncryption.decrypt("encrypted-cookie")).thenReturn("decrypted-cookie");

    SpotifyTrack track1 = new SpotifyTrack();
    track1.setId("track1");
    when(spotifyService.getPlaylistTracks(any(), any())).thenReturn(List.of(track1));

    // Track needs review
    TrackMatch match = new TrackMatch();
    match.setStatus(MatchStatus.PENDING_REVIEW);
    match.setMatchConfidence(0.75);
    when(matchingService.findBestMatch(any(), any(), any(), any())).thenReturn(match);

    // When
    conversionWorker.processConversionJob(1L);

    // Then
    verify(jobRepository, atLeastOnce()).save(argThat(j ->
        j.getStatus() == JobStatus.REVIEW_PENDING &&
        j.getLowConfidenceMatches() == 1
    ));
    verify(neteaseService, never()).addTracksToPlaylist(any(), any(), any());
  }
}
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=ConversionWorkerTest`

Expected: FAIL with "cannot find symbol: class ConversionWorker"

**Step 3: Write minimal implementation**

Create: `spotease-backend/src/main/java/com/spotease/worker/ConversionWorker.java`

```java
package com.spotease.worker;

import com.spotease.model.*;
import com.spotease.repository.ConversionJobRepository;
import com.spotease.repository.TrackMatchRepository;
import com.spotease.service.*;
import com.spotease.util.TokenEncryption;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ConversionWorker {

  private final ConversionJobRepository jobRepository;
  private final TrackMatchRepository trackMatchRepository;
  private final SpotifyService spotifyService;
  private final NeteaseService neteaseService;
  private final MatchingService matchingService;
  private final WebSocketService webSocketService;
  private final TokenEncryption tokenEncryption;

  @Async("taskExecutor")
  @Transactional
  public void processConversionJob(Long jobId) {
    log.info("Starting processing of conversion job {}", jobId);

    ConversionJob job = jobRepository.findById(jobId)
        .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

    try {
      // Update status to PROCESSING
      job.setStatus(JobStatus.PROCESSING);
      jobRepository.save(job);
      webSocketService.sendJobUpdate(job);

      // Decrypt tokens
      String sourceToken = getSourceToken(job);
      String destToken = getDestinationToken(job);

      // Create destination playlist if CREATE mode
      if (job.getMode() == ConversionMode.CREATE) {
        String playlistId = createDestinationPlaylist(job, destToken);
        job.setDestinationPlaylistId(playlistId);
        jobRepository.save(job);
      }

      // Get source tracks
      List<?> sourceTracks = getSourceTracks(job, sourceToken);
      log.info("Found {} tracks in source playlist", sourceTracks.size());

      // Process each track
      List<String> autoMatchedTrackIds = new ArrayList<>();

      for (int i = 0; i < sourceTracks.size(); i++) {
        Object sourceTrack = sourceTracks.get(i);

        // Find best match
        TrackMatch match = matchingService.findBestMatch(
            sourceTrack,
            job.getDestinationPlatform(),
            destToken,
            job
        );

        // Save match
        trackMatchRepository.save(match);

        // Update counters
        job.setProcessedTracks(i + 1);

        if (match.getStatus() == MatchStatus.AUTO_MATCHED) {
          job.setHighConfidenceMatches(job.getHighConfidenceMatches() + 1);
          autoMatchedTrackIds.add(match.getDestinationTrackId());
        } else if (match.getStatus() == MatchStatus.PENDING_REVIEW) {
          job.setLowConfidenceMatches(job.getLowConfidenceMatches() + 1);
        } else {
          job.setFailedTracks(job.getFailedTracks() + 1);
        }

        // Save progress and send update every 5 tracks or on last track
        if (i % 5 == 0 || i == sourceTracks.size() - 1) {
          jobRepository.save(job);
          webSocketService.sendJobUpdate(job);
        }
      }

      // Add auto-matched tracks to destination playlist
      if (!autoMatchedTrackIds.isEmpty()) {
        addTracksToDestination(job, destToken, autoMatchedTrackIds);
      }

      // Determine final status
      if (job.getLowConfidenceMatches() > 0 || job.getFailedTracks() > 0) {
        job.setStatus(JobStatus.REVIEW_PENDING);
      } else {
        job.setStatus(JobStatus.COMPLETED);
        job.setCompletedAt(LocalDateTime.now());
      }

      jobRepository.save(job);
      webSocketService.sendJobComplete(job);

      log.info("Completed job {}: {} auto-matched, {} pending review, {} failed",
          jobId, job.getHighConfidenceMatches(), job.getLowConfidenceMatches(), job.getFailedTracks());

    } catch (Exception e) {
      log.error("Error processing job {}: {}", jobId, e.getMessage(), e);
      job.setStatus(JobStatus.FAILED);
      jobRepository.save(job);
      webSocketService.sendJobError(job, e.getMessage());
      throw new RuntimeException("Failed to process conversion job", e);
    }
  }

  private String getSourceToken(ConversionJob job) {
    if (job.getSourcePlatform() == Platform.SPOTIFY) {
      return tokenEncryption.decrypt(job.getUser().getSpotifyAccessToken());
    } else {
      return tokenEncryption.decrypt(job.getUser().getNeteaseCookie());
    }
  }

  private String getDestinationToken(ConversionJob job) {
    if (job.getDestinationPlatform() == Platform.SPOTIFY) {
      return tokenEncryption.decrypt(job.getUser().getSpotifyAccessToken());
    } else {
      return tokenEncryption.decrypt(job.getUser().getNeteaseCookie());
    }
  }

  private List<?> getSourceTracks(ConversionJob job, String token) {
    if (job.getSourcePlatform() == Platform.SPOTIFY) {
      return spotifyService.getPlaylistTracks(token, job.getSourcePlaylistId());
    } else {
      return neteaseService.getPlaylistTracks(token, job.getSourcePlaylistId());
    }
  }

  private String createDestinationPlaylist(ConversionJob job, String token) {
    log.info("Creating destination playlist: {}", job.getDestinationPlaylistName());

    if (job.getDestinationPlatform() == Platform.SPOTIFY) {
      return spotifyService.createPlaylist(token, job.getDestinationPlaylistName());
    } else {
      return neteaseService.createPlaylist(token, job.getDestinationPlaylistName());
    }
  }

  private void addTracksToDestination(ConversionJob job, String token, List<String> trackIds) {
    log.info("Adding {} tracks to destination playlist", trackIds.size());

    if (job.getDestinationPlatform() == Platform.SPOTIFY) {
      // Spotify expects URIs in format: spotify:track:id
      List<String> uris = trackIds.stream()
          .map(id -> "spotify:track:" + id)
          .toList();
      spotifyService.addTracksToPlaylist(token, job.getDestinationPlaylistId(), uris);
    } else {
      neteaseService.addTracksToPlaylist(token, job.getDestinationPlaylistId(), trackIds);
    }
  }
}
```

**Step 4: Add createPlaylist methods to services**

We need `createPlaylist` methods. Add to SpotifyService:

```java
public String createPlaylist(String accessToken, String playlistName) {
  // TODO: Implement using Spotify SDK
  return "new-playlist-id";
}
```

Add to NeteaseService:

```java
public String createPlaylist(String cookie, String playlistName) {
  // TODO: Implement using NetEase API
  return "new-playlist-id";
}
```

**Step 5: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=ConversionWorkerTest#shouldProcessJobWithAutoMatchedTracks`

Expected: PASS (may need to adjust mocks)

**Step 6: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/worker/ConversionWorker.java \
        spotease-backend/src/test/java/com/spotease/worker/ConversionWorkerTest.java
git commit -m "feat: implement ConversionWorker async processor with track matching"
```

---

## Task 7: Integrate ConversionWorker with ConversionService

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/service/ConversionService.java`
- Modify: `spotease-backend/src/test/java/com/spotease/service/ConversionServiceTest.java`

**Step 1: Update test to verify worker is triggered**

Add to `ConversionServiceTest.java`:

```java
  @Mock
  private ConversionWorker conversionWorker;

  // Add test:
  @Test
  void shouldTriggerWorkerAfterJobCreation() {
    // Given
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(spotifyService.getPlaylists(any())).thenReturn(List.of(sourcePlaylist));

    ConversionJob savedJob = new ConversionJob();
    savedJob.setId(1L);
    when(jobRepository.save(any())).thenReturn(savedJob);

    // When
    conversionService.createJob(1L, request);

    // Then
    verify(conversionWorker).processConversionJob(1L);
  }
```

**Step 2: Update ConversionService to trigger worker**

Add to ConversionService:

```java
  private final ConversionWorker conversionWorker;

  // At end of createJob method, before return:
  // Trigger async worker
  conversionWorker.processConversionJob(savedJob.getId());
```

**Step 3: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=ConversionServiceTest#shouldTriggerWorkerAfterJobCreation`

Expected: PASS

**Step 4: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/service/ConversionService.java \
        spotease-backend/src/test/java/com/spotease/service/ConversionServiceTest.java
git commit -m "feat: integrate ConversionWorker with ConversionService"
```

---

## Task 8: Create ConversionController

**Files:**
- Create: `spotease-backend/src/test/java/com/spotease/controller/ConversionControllerTest.java`
- Create: `spotease-backend/src/main/java/com/spotease/controller/ConversionController.java`

**Step 1: Write the failing test**

Create: `spotease-backend/src/test/java/com/spotease/controller/ConversionControllerTest.java`

```java
package com.spotease.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spotease.dto.ConversionRequest;
import com.spotease.dto.ConversionResponse;
import com.spotease.model.*;
import com.spotease.repository.ConversionJobRepository;
import com.spotease.service.ConversionService;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ConversionControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @MockBean
  private ConversionService conversionService;

  @MockBean
  private ConversionJobRepository jobRepository;

  private MockHttpSession session;
  private ConversionRequest request;

  @BeforeEach
  void setUp() {
    session = new MockHttpSession();
    session.setAttribute("userId", 1L);

    request = ConversionRequest.builder()
        .sourcePlatform(Platform.SPOTIFY)
        .sourcePlaylistId("playlist123")
        .mode(ConversionMode.CREATE)
        .destinationPlaylistName("My Playlist")
        .build();
  }

  @Test
  void shouldCreateConversionJob() throws Exception {
    // Given
    ConversionJob job = new ConversionJob();
    job.setId(1L);
    job.setStatus(JobStatus.QUEUED);
    job.setTotalTracks(10);

    when(conversionService.createJob(eq(1L), any(ConversionRequest.class)))
        .thenReturn(job);

    // When/Then
    mockMvc.perform(post("/api/conversions")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.jobId").value(1))
        .andExpect(jsonPath("$.status").value("QUEUED"))
        .andExpect(jsonPath("$.totalTracks").value(10));
  }

  @Test
  void shouldGetAllUserJobs() throws Exception {
    // Given
    ConversionJob job1 = new ConversionJob();
    job1.setId(1L);
    job1.setStatus(JobStatus.COMPLETED);

    when(jobRepository.findByUserId(1L)).thenReturn(List.of(job1));

    // When/Then
    mockMvc.perform(get("/api/conversions")
            .session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].jobId").value(1))
        .andExpect(jsonPath("$[0].status").value("COMPLETED"));
  }

  @Test
  void shouldRequireAuthentication() throws Exception {
    // When/Then - no session
    mockMvc.perform(post("/api/conversions")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isUnauthorized());
  }
}
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=ConversionControllerTest`

Expected: FAIL with "cannot find symbol: class ConversionController"

**Step 3: Write minimal implementation**

Create: `spotease-backend/src/main/java/com/spotease/controller/ConversionController.java`

```java
package com.spotease.controller;

import com.spotease.dto.ConversionRequest;
import com.spotease.dto.ConversionResponse;
import com.spotease.model.ConversionJob;
import com.spotease.repository.ConversionJobRepository;
import com.spotease.service.ConversionService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/conversions")
@RequiredArgsConstructor
@Slf4j
public class ConversionController {

  private final ConversionService conversionService;
  private final ConversionJobRepository jobRepository;

  @PostMapping
  public ResponseEntity<ConversionResponse> createConversion(
      @Valid @RequestBody ConversionRequest request,
      HttpSession session) {

    Long userId = getUserIdFromSession(session);
    log.info("Creating conversion job for user {}", userId);

    ConversionJob job = conversionService.createJob(userId, request);

    return ResponseEntity.ok(mapToResponse(job));
  }

  @GetMapping
  public ResponseEntity<List<ConversionResponse>> getAllConversions(HttpSession session) {
    Long userId = getUserIdFromSession(session);
    log.info("Fetching all conversions for user {}", userId);

    List<ConversionJob> jobs = jobRepository.findByUserId(userId);
    List<ConversionResponse> responses = jobs.stream()
        .map(this::mapToResponse)
        .collect(Collectors.toList());

    return ResponseEntity.ok(responses);
  }

  @GetMapping("/{jobId}")
  public ResponseEntity<ConversionResponse> getConversion(
      @PathVariable Long jobId,
      HttpSession session) {

    Long userId = getUserIdFromSession(session);

    ConversionJob job = jobRepository.findById(jobId)
        .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

    // Verify ownership
    if (!job.getUser().getId().equals(userId)) {
      throw new RuntimeException("Unauthorized access to job: " + jobId);
    }

    return ResponseEntity.ok(mapToResponse(job));
  }

  @DeleteMapping("/{jobId}")
  public ResponseEntity<Void> deleteConversion(
      @PathVariable Long jobId,
      HttpSession session) {

    Long userId = getUserIdFromSession(session);

    ConversionJob job = jobRepository.findById(jobId)
        .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

    // Verify ownership
    if (!job.getUser().getId().equals(userId)) {
      throw new RuntimeException("Unauthorized access to job: " + jobId);
    }

    jobRepository.delete(job);
    log.info("Deleted conversion job {}", jobId);

    return ResponseEntity.noContent().build();
  }

  private Long getUserIdFromSession(HttpSession session) {
    Long userId = (Long) session.getAttribute("userId");
    if (userId == null) {
      throw new RuntimeException("Unauthorized: No user session found");
    }
    return userId;
  }

  private ConversionResponse mapToResponse(ConversionJob job) {
    return ConversionResponse.builder()
        .jobId(job.getId())
        .status(job.getStatus())
        .sourcePlaylistName(job.getSourcePlaylistName())
        .destinationPlaylistName(job.getDestinationPlaylistName())
        .totalTracks(job.getTotalTracks())
        .processedTracks(job.getProcessedTracks())
        .highConfidenceMatches(job.getHighConfidenceMatches())
        .lowConfidenceMatches(job.getLowConfidenceMatches())
        .failedTracks(job.getFailedTracks())
        .createdAt(job.getCreatedAt())
        .completedAt(job.getCompletedAt())
        .build();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=ConversionControllerTest`

Expected: PASS

**Step 5: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/controller/ConversionController.java \
        spotease-backend/src/test/java/com/spotease/controller/ConversionControllerTest.java
git commit -m "feat: implement ConversionController REST endpoints"
```

---

## Task 9: Implement CREATE Playlist Methods in Services

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/service/SpotifyService.java`
- Modify: `spotease-backend/src/main/java/com/spotease/service/NeteaseService.java`

**Step 1: Implement SpotifyService.createPlaylist**

Add to SpotifyService:

```java
  public String createPlaylist(String accessToken, String playlistName) {
    try {
      SpotifyApi authenticatedApi = createAuthenticatedApi(accessToken);

      // Get current user ID
      GetCurrentUsersProfileRequest profileRequest = authenticatedApi.getCurrentUsersProfile()
          .build();
      String userId = profileRequest.execute().getId();

      // Create playlist
      CreatePlaylistRequest createPlaylistRequest = authenticatedApi
          .createPlaylist(userId, playlistName)
          .public_(false)
          .build();

      Playlist playlist = createPlaylistRequest.execute();
      return playlist.getId();
    } catch (Exception e) {
      throw new RuntimeException("Failed to create Spotify playlist", e);
    }
  }
```

Don't forget to add import:

```java
import se.michaelthelin.spotify.model_objects.specification.Playlist;
import se.michaelthelin.spotify.requests.data.playlists.CreatePlaylistRequest;
```

**Step 2: Implement NeteaseService.createPlaylist**

Add to NeteaseService:

```java
  public String createPlaylist(String cookie, String playlistName) {
    try {
      NeteaseResponse<NeteaseResponse.NeteasePlaylistWrapper> response = getWebClient(cookie)
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/playlist/create")
              .queryParam("name", playlistName)
              .queryParam("privacy", 10) // 10 = private
              .build())
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<NeteaseResponse.NeteasePlaylistWrapper>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      if (response != null && response.getData() != null && response.getData().getPlaylist() != null) {
        return response.getData().getPlaylist().getId();
      }

      throw new RuntimeException("Failed to create NetEase playlist: Invalid response");
    } catch (Exception e) {
      throw new RuntimeException("Failed to create NetEase playlist", e);
    }
  }
```

**Step 3: Verify compilation**

Run: `cd spotease-backend && ./mvnw compile`

Expected: BUILD SUCCESS

**Step 4: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/service/SpotifyService.java \
        spotease-backend/src/main/java/com/spotease/service/NeteaseService.java
git commit -m "feat: implement createPlaylist methods for Spotify and NetEase"
```

---

## Task 10: Implement UPDATE Mode - Check Existing Tracks

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/worker/ConversionWorker.java`
- Modify: `spotease-backend/src/test/java/com/spotease/worker/ConversionWorkerTest.java`

**Step 1: Add test for UPDATE mode**

Add to ConversionWorkerTest:

```java
  @Test
  void shouldSkipExistingTracksInUpdateMode() {
    // Given
    job.setMode(ConversionMode.UPDATE);
    job.setDestinationPlaylistId("existing-playlist-id");

    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(tokenEncryption.decrypt(any())).thenReturn("decrypted-token");

    SpotifyTrack sourceTrack = new SpotifyTrack();
    sourceTrack.setId("track1");
    when(spotifyService.getPlaylistTracks(any(), eq("playlist123")))
        .thenReturn(List.of(sourceTrack));

    // Destination already has track1
    NeteaseTrack existingTrack = new NeteaseTrack();
    existingTrack.setId("netease-track1");
    when(neteaseService.getPlaylistTracks(any(), eq("existing-playlist-id")))
        .thenReturn(List.of(existingTrack));

    TrackMatch match = new TrackMatch();
    match.setStatus(MatchStatus.AUTO_MATCHED);
    match.setDestinationTrackId("netease-track1");
    when(matchingService.findBestMatch(any(), any(), any(), any())).thenReturn(match);

    // When
    conversionWorker.processConversionJob(1L);

    // Then
    verify(neteaseService, never()).addTracksToPlaylist(any(), any(), any());
  }
```

**Step 2: Update ConversionWorker to handle UPDATE mode**

Modify the `processConversionJob` method in ConversionWorker:

```java
  // After getting source tracks, add:

  // For UPDATE mode, get existing tracks from destination
  List<String> existingTrackIds = new ArrayList<>();
  if (job.getMode() == ConversionMode.UPDATE) {
    List<?> existingTracks = getDestinationTracks(job, destToken);
    existingTrackIds = extractTrackIds(existingTracks);
    log.info("Found {} existing tracks in destination playlist", existingTrackIds.size());
  }

  // In the loop, before adding to autoMatchedTrackIds:
  if (match.getStatus() == MatchStatus.AUTO_MATCHED) {
    job.setHighConfidenceMatches(job.getHighConfidenceMatches() + 1);

    // Skip if already exists in UPDATE mode
    if (job.getMode() == ConversionMode.UPDATE &&
        existingTrackIds.contains(match.getDestinationTrackId())) {
      log.debug("Track {} already exists in destination, skipping", match.getDestinationTrackId());
    } else {
      autoMatchedTrackIds.add(match.getDestinationTrackId());
    }
  }
```

Add helper methods:

```java
  private List<?> getDestinationTracks(ConversionJob job, String token) {
    if (job.getDestinationPlatform() == Platform.SPOTIFY) {
      return spotifyService.getPlaylistTracks(token, job.getDestinationPlaylistId());
    } else {
      return neteaseService.getPlaylistTracks(token, job.getDestinationPlaylistId());
    }
  }

  private List<String> extractTrackIds(List<?> tracks) {
    return tracks.stream()
        .map(track -> {
          if (track instanceof com.spotease.dto.spotify.SpotifyTrack) {
            return ((com.spotease.dto.spotify.SpotifyTrack) track).getId();
          } else if (track instanceof com.spotease.dto.netease.NeteaseTrack) {
            return ((com.spotease.dto.netease.NeteaseTrack) track).getId();
          }
          return null;
        })
        .filter(id -> id != null)
        .toList();
  }
```

**Step 3: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=ConversionWorkerTest#shouldSkipExistingTracksInUpdateMode`

Expected: PASS

**Step 4: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/worker/ConversionWorker.java \
        spotease-backend/src/test/java/com/spotease/worker/ConversionWorkerTest.java
git commit -m "feat: implement UPDATE mode with existing track detection"
```

---

## Task 11: Add Error Handling and Retry Logic

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/worker/ConversionWorker.java`
- Modify: `spotease-backend/src/test/java/com/spotease/worker/ConversionWorkerTest.java`

**Step 1: Add test for error handling**

Add to ConversionWorkerTest:

```java
  @Test
  void shouldHandleErrorsGracefully() {
    // Given
    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(tokenEncryption.decrypt(any())).thenReturn("decrypted-token");
    when(spotifyService.getPlaylistTracks(any(), any()))
        .thenThrow(new RuntimeException("Spotify API error"));

    // When
    conversionWorker.processConversionJob(1L);

    // Then
    verify(jobRepository).save(argThat(j -> j.getStatus() == JobStatus.FAILED));
    verify(webSocketService).sendJobError(any(ConversionJob.class), anyString());
  }
```

**Step 2: Update error handling in ConversionWorker**

The error handling is already in place in the try-catch block. Enhance it:

```java
  } catch (Exception e) {
    log.error("Error processing job {}: {}", jobId, e.getMessage(), e);

    // Reload job to ensure we have latest state
    ConversionJob failedJob = jobRepository.findById(jobId)
        .orElse(job);

    failedJob.setStatus(JobStatus.FAILED);
    jobRepository.save(failedJob);
    webSocketService.sendJobError(failedJob, e.getMessage());

    // Don't rethrow - we've handled the error
  }
```

**Step 3: Add retry logic for API calls**

The retry logic is already built into the services using `retryWhen`. No changes needed.

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=ConversionWorkerTest#shouldHandleErrorsGracefully`

Expected: PASS

**Step 5: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/worker/ConversionWorker.java \
        spotease-backend/src/test/java/com/spotease/worker/ConversionWorkerTest.java
git commit -m "feat: enhance error handling in ConversionWorker"
```

---

## Task 12: Add Review Endpoints for Pending Matches

**Files:**
- Create: `spotease-backend/src/main/java/com/spotease/controller/ReviewController.java`
- Create: `spotease-backend/src/main/java/com/spotease/dto/TrackMatchDto.java`

**Step 1: Create TrackMatchDto**

Create: `spotease-backend/src/main/java/com/spotease/dto/TrackMatchDto.java`

```java
package com.spotease.dto;

import com.spotease.model.MatchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackMatchDto {
  private Long matchId;
  private String sourceTrackId;
  private String sourceTrackName;
  private String sourceArtist;
  private String sourceAlbum;
  private Integer sourceDuration;
  private String destinationTrackId;
  private String destinationTrackName;
  private String destinationArtist;
  private Double matchConfidence;
  private MatchStatus status;
  private String errorMessage;
}
```

**Step 2: Create ReviewController**

Create: `spotease-backend/src/main/java/com/spotease/controller/ReviewController.java`

```java
package com.spotease.controller;

import com.spotease.dto.TrackMatchDto;
import com.spotease.model.ConversionJob;
import com.spotease.model.MatchStatus;
import com.spotease.model.TrackMatch;
import com.spotease.repository.ConversionJobRepository;
import com.spotease.repository.TrackMatchRepository;
import com.spotease.service.SpotifyService;
import com.spotease.service.NeteaseService;
import com.spotease.util.TokenEncryption;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/conversions/{jobId}/matches")
@RequiredArgsConstructor
@Slf4j
public class ReviewController {

  private final ConversionJobRepository jobRepository;
  private final TrackMatchRepository trackMatchRepository;
  private final SpotifyService spotifyService;
  private final NeteaseService neteaseService;
  private final TokenEncryption tokenEncryption;

  @GetMapping("/pending")
  public ResponseEntity<List<TrackMatchDto>> getPendingMatches(
      @PathVariable Long jobId,
      HttpSession session) {

    verifyJobOwnership(jobId, session);

    List<TrackMatch> pendingMatches = trackMatchRepository.findByConversionJobIdAndStatus(
        jobId, MatchStatus.PENDING_REVIEW);

    List<TrackMatch> failedMatches = trackMatchRepository.findByConversionJobIdAndStatus(
        jobId, MatchStatus.FAILED);

    List<TrackMatch> allMatches = new java.util.ArrayList<>(pendingMatches);
    allMatches.addAll(failedMatches);

    List<TrackMatchDto> dtos = allMatches.stream()
        .map(this::mapToDto)
        .collect(Collectors.toList());

    return ResponseEntity.ok(dtos);
  }

  @PostMapping("/{matchId}/approve")
  public ResponseEntity<Void> approveMatch(
      @PathVariable Long jobId,
      @PathVariable Long matchId,
      HttpSession session) {

    ConversionJob job = verifyJobOwnership(jobId, session);

    TrackMatch match = trackMatchRepository.findById(matchId)
        .orElseThrow(() -> new RuntimeException("Match not found: " + matchId));

    // Verify match belongs to job
    if (!match.getConversionJob().getId().equals(jobId)) {
      throw new RuntimeException("Match does not belong to job");
    }

    // Add track to destination playlist
    String destToken = getDestinationToken(job);
    addSingleTrack(job, destToken, match.getDestinationTrackId());

    // Update match status
    match.setStatus(MatchStatus.USER_APPROVED);
    match.setReviewedAt(LocalDateTime.now());
    match.setAppliedAt(LocalDateTime.now());
    trackMatchRepository.save(match);

    log.info("Approved match {} for job {}", matchId, jobId);

    return ResponseEntity.ok().build();
  }

  @PostMapping("/{matchId}/skip")
  public ResponseEntity<Void> skipMatch(
      @PathVariable Long jobId,
      @PathVariable Long matchId,
      HttpSession session) {

    verifyJobOwnership(jobId, session);

    TrackMatch match = trackMatchRepository.findById(matchId)
        .orElseThrow(() -> new RuntimeException("Match not found: " + matchId));

    // Verify match belongs to job
    if (!match.getConversionJob().getId().equals(jobId)) {
      throw new RuntimeException("Match does not belong to job");
    }

    // Update match status
    match.setStatus(MatchStatus.USER_SKIPPED);
    match.setReviewedAt(LocalDateTime.now());
    trackMatchRepository.save(match);

    log.info("Skipped match {} for job {}", matchId, jobId);

    return ResponseEntity.ok().build();
  }

  private ConversionJob verifyJobOwnership(Long jobId, HttpSession session) {
    Long userId = (Long) session.getAttribute("userId");
    if (userId == null) {
      throw new RuntimeException("Unauthorized: No user session found");
    }

    ConversionJob job = jobRepository.findById(jobId)
        .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

    if (!job.getUser().getId().equals(userId)) {
      throw new RuntimeException("Unauthorized access to job: " + jobId);
    }

    return job;
  }

  private String getDestinationToken(ConversionJob job) {
    if (job.getDestinationPlatform() == com.spotease.model.Platform.SPOTIFY) {
      return tokenEncryption.decrypt(job.getUser().getSpotifyAccessToken());
    } else {
      return tokenEncryption.decrypt(job.getUser().getNeteaseCookie());
    }
  }

  private void addSingleTrack(ConversionJob job, String token, String trackId) {
    List<String> trackIds = List.of(trackId);

    if (job.getDestinationPlatform() == com.spotease.model.Platform.SPOTIFY) {
      List<String> uris = trackIds.stream()
          .map(id -> "spotify:track:" + id)
          .toList();
      spotifyService.addTracksToPlaylist(token, job.getDestinationPlaylistId(), uris);
    } else {
      neteaseService.addTracksToPlaylist(token, job.getDestinationPlaylistId(), trackIds);
    }
  }

  private TrackMatchDto mapToDto(TrackMatch match) {
    return TrackMatchDto.builder()
        .matchId(match.getId())
        .sourceTrackId(match.getSourceTrackId())
        .sourceTrackName(match.getSourceTrackName())
        .sourceArtist(match.getSourceArtist())
        .sourceAlbum(match.getSourceAlbum())
        .sourceDuration(match.getSourceDuration())
        .destinationTrackId(match.getDestinationTrackId())
        .destinationTrackName(match.getDestinationTrackName())
        .destinationArtist(match.getDestinationArtist())
        .matchConfidence(match.getMatchConfidence())
        .status(match.getStatus())
        .errorMessage(match.getErrorMessage())
        .build();
  }
}
```

**Step 3: Verify compilation**

Run: `cd spotease-backend && ./mvnw compile`

Expected: BUILD SUCCESS

**Step 4: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/controller/ReviewController.java \
        spotease-backend/src/main/java/com/spotease/dto/TrackMatchDto.java
git commit -m "feat: implement review endpoints for pending track matches"
```

---

## Task 13: Run Full Test Suite

**Files:**
- None (verification task)

**Step 1: Run all tests**

Run: `cd spotease-backend && ./mvnw clean test`

Expected: All tests PASS

**Step 2: Verify application starts**

Run: `cd spotease-backend && ./mvnw spring-boot:run`

Expected: Application starts on port 8080 with WebSocket enabled

**Step 3: Check health endpoint**

Run: `curl http://localhost:8080/api/health`

Expected: `{"status":"healthy"}`

**Step 4: Stop application**

Press Ctrl+C

**Step 5: Fix any failing tests**

If tests fail, fix them and commit:

```bash
git add .
git commit -m "fix: resolve test failures"
```

---

## Task 14: Update README Documentation

**Files:**
- Modify: `spotease-backend/README.md`

**Step 1: Update implementation status**

Add to README.md:

```markdown
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
```

**Step 2: Commit**

```bash
git add spotease-backend/README.md
git commit -m "docs: update README with conversion worker implementation"
```

---

## Completion Checklist

- [ ] Task 1: WebSocket STOMP configuration
- [ ] Task 2: WebSocket message DTOs
- [ ] Task 3: WebSocketService with tests
- [ ] Task 4: Conversion request/response DTOs
- [ ] Task 5: ConversionService job creation with tests
- [ ] Task 6: ConversionWorker basic structure with tests
- [ ] Task 7: ConversionWorker integration with ConversionService
- [ ] Task 8: ConversionController REST endpoints with tests
- [ ] Task 9: CREATE playlist methods in services
- [ ] Task 10: UPDATE mode with existing track detection
- [ ] Task 11: Error handling and retry logic
- [ ] Task 12: Review endpoints for pending matches
- [ ] Task 13: Full test suite passes
- [ ] Task 14: README documentation updated

**Total Tasks:** 14

**Estimated Time:** 3-4 hours with TDD approach

---

## Next Steps

After completing this implementation:

1. **Manual Testing** - Test full conversion flow with real Spotify/NetEase accounts
2. **Frontend Integration** - Connect React frontend to WebSocket and REST endpoints
3. **Performance Tuning** - Optimize batch operations, WebSocket update frequency
4. **Search Endpoint** - Implement manual search for alternative matches
5. **Rate Limiting** - Add per-user rate limits to prevent abuse

---

**End of Implementation Plan**
