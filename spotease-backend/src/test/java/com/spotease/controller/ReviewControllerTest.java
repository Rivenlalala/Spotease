package com.spotease.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spotease.dto.TrackMatchDto;
import com.spotease.model.*;
import com.spotease.repository.ConversionJobRepository;
import com.spotease.repository.TrackMatchRepository;
import com.spotease.repository.UserRepository;
import com.spotease.service.NeteaseService;
import com.spotease.service.SpotifyService;
import com.spotease.util.TokenEncryption;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ReviewControllerTest {

  private MockMvc mockMvc;

  private ObjectMapper objectMapper;

  @Mock
  private ConversionJobRepository jobRepository;

  @Mock
  private TrackMatchRepository matchRepository;

  @Mock
  private UserRepository userRepository;

  @Mock
  private SpotifyService spotifyService;

  @Mock
  private NeteaseService neteaseService;

  @Mock
  private TokenEncryption tokenEncryption;

  @InjectMocks
  private ReviewController reviewController;

  private MockHttpSession authenticatedSession;
  private User user;
  private ConversionJob job;
  private TrackMatch pendingMatch;
  private TrackMatch failedMatch;

  @BeforeEach
  void setUp() {
    // Set up MockMvc with standalone setup
    mockMvc = MockMvcBuilders.standaloneSetup(reviewController).build();
    objectMapper = new ObjectMapper();
    objectMapper.findAndRegisterModules(); // Register JavaTimeModule for LocalDateTime

    // Create authenticated session
    authenticatedSession = new MockHttpSession();
    authenticatedSession.setAttribute("userId", 1L);

    // Create test user
    user = new User();
    user.setId(1L);
    user.setEmail("test@example.com");
    user.setSpotifyUserId("spotify123");
    user.setSpotifyAccessToken("encrypted_access_token");
    user.setNeteaseCookie("encrypted_cookie");

    // Create conversion job
    job = new ConversionJob();
    job.setId(1L);
    job.setUser(user);
    job.setSourcePlatform(Platform.SPOTIFY);
    job.setSourcePlaylistId("spotify-playlist-123");
    job.setSourcePlaylistName("Original Playlist");
    job.setDestinationPlatform(Platform.NETEASE);
    job.setDestinationPlaylistId("netease-playlist-456");
    job.setDestinationPlaylistName("My New Playlist");
    job.setMode(ConversionMode.CREATE);
    job.setStatus(JobStatus.PROCESSING);
    job.setTotalTracks(10);
    job.setProcessedTracks(5);
    job.setCreatedAt(LocalDateTime.now());

    // Create pending match
    pendingMatch = new TrackMatch();
    pendingMatch.setId(1L);
    pendingMatch.setConversionJob(job);
    pendingMatch.setSourceTrackId("spotify-track-1");
    pendingMatch.setSourceTrackName("Test Track 1");
    pendingMatch.setSourceArtist("Test Artist 1");
    pendingMatch.setSourceAlbum("Test Album 1");
    pendingMatch.setSourceDuration(180000);
    pendingMatch.setDestinationTrackId("netease-track-1");
    pendingMatch.setDestinationTrackName("Test Track 1");
    pendingMatch.setDestinationArtist("Test Artist 1");
    pendingMatch.setMatchConfidence(0.75);
    pendingMatch.setStatus(MatchStatus.PENDING_REVIEW);

    // Create failed match
    failedMatch = new TrackMatch();
    failedMatch.setId(2L);
    failedMatch.setConversionJob(job);
    failedMatch.setSourceTrackId("spotify-track-2");
    failedMatch.setSourceTrackName("Test Track 2");
    failedMatch.setSourceArtist("Test Artist 2");
    failedMatch.setSourceAlbum("Test Album 2");
    failedMatch.setSourceDuration(200000);
    failedMatch.setStatus(MatchStatus.FAILED);
    failedMatch.setErrorMessage("No match found");
  }

  @Test
  void shouldGetPendingMatches() throws Exception {
    // Given
    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(matchRepository.findByConversionJob_IdAndStatusIn(1L, List.of(MatchStatus.PENDING_REVIEW, MatchStatus.FAILED)))
        .thenReturn(List.of(pendingMatch, failedMatch));

    // When & Then
    mockMvc.perform(get("/api/conversions/1/matches/pending")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(2)))
        .andExpect(jsonPath("$[0].matchId", is(1)))
        .andExpect(jsonPath("$[0].sourceTrackName", is("Test Track 1")))
        .andExpect(jsonPath("$[0].status", is("PENDING_REVIEW")))
        .andExpect(jsonPath("$[0].matchConfidence", is(0.75)))
        .andExpect(jsonPath("$[1].matchId", is(2)))
        .andExpect(jsonPath("$[1].sourceTrackName", is("Test Track 2")))
        .andExpect(jsonPath("$[1].status", is("FAILED")))
        .andExpect(jsonPath("$[1].errorMessage", is("No match found")));

    verify(jobRepository).findById(1L);
    verify(matchRepository).findByConversionJob_IdAndStatusIn(1L, List.of(MatchStatus.PENDING_REVIEW, MatchStatus.FAILED));
  }

  @Test
  void shouldReturnUnauthorizedWhenNoSession() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/conversions/1/matches/pending"))
        .andExpect(status().isUnauthorized());

    verify(jobRepository, never()).findById(any());
    verify(matchRepository, never()).findByConversionJob_IdAndStatusIn(any(), any());
  }

  @Test
  void shouldReturnForbiddenWhenUserDoesNotOwnJob() throws Exception {
    // Given: Job belongs to different user
    User otherUser = new User();
    otherUser.setId(2L);
    job.setUser(otherUser);

    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));

    // When & Then
    mockMvc.perform(get("/api/conversions/1/matches/pending")
            .session(authenticatedSession))
        .andExpect(status().isForbidden());

    verify(jobRepository).findById(1L);
    verify(matchRepository, never()).findByConversionJob_IdAndStatusIn(any(), any());
  }

  @Test
  void shouldReturnNotFoundWhenJobDoesNotExist() throws Exception {
    // Given
    when(jobRepository.findById(999L)).thenReturn(Optional.empty());

    // When & Then
    mockMvc.perform(get("/api/conversions/999/matches/pending")
            .session(authenticatedSession))
        .andExpect(status().isNotFound());

    verify(jobRepository).findById(999L);
    verify(matchRepository, never()).findByConversionJob_IdAndStatusIn(any(), any());
  }

  @Test
  void shouldApproveMatchAndAddTrack() throws Exception {
    // Given
    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(matchRepository.findById(1L)).thenReturn(Optional.of(pendingMatch));
    when(tokenEncryption.decrypt("encrypted_cookie")).thenReturn("decrypted_cookie");

    // When & Then
    mockMvc.perform(post("/api/conversions/1/matches/1/approve")
            .session(authenticatedSession))
        .andExpect(status().isOk());

    // Verify match was updated
    ArgumentCaptor<TrackMatch> matchCaptor = ArgumentCaptor.forClass(TrackMatch.class);
    verify(matchRepository).save(matchCaptor.capture());
    TrackMatch savedMatch = matchCaptor.getValue();
    assertEquals(MatchStatus.USER_APPROVED, savedMatch.getStatus());
    assertNotNull(savedMatch.getReviewedAt());
    assertNotNull(savedMatch.getAppliedAt());

    // Verify track was added to NetEase playlist
    verify(neteaseService).addTracksToPlaylist(
        eq("decrypted_cookie"),
        eq("netease-playlist-456"),
        eq(List.of("netease-track-1"))
    );
  }

  @Test
  void shouldApproveMatchAndAddTrackToSpotify() throws Exception {
    // Given: Job targeting Spotify
    job.setDestinationPlatform(Platform.SPOTIFY);
    job.setDestinationPlaylistId("spotify-playlist-789");

    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(matchRepository.findById(1L)).thenReturn(Optional.of(pendingMatch));
    when(tokenEncryption.decrypt("encrypted_access_token")).thenReturn("decrypted_access_token");

    // When & Then
    mockMvc.perform(post("/api/conversions/1/matches/1/approve")
            .session(authenticatedSession))
        .andExpect(status().isOk());

    // Verify match was updated
    ArgumentCaptor<TrackMatch> matchCaptor = ArgumentCaptor.forClass(TrackMatch.class);
    verify(matchRepository).save(matchCaptor.capture());
    TrackMatch savedMatch = matchCaptor.getValue();
    assertEquals(MatchStatus.USER_APPROVED, savedMatch.getStatus());

    // Verify track was added to Spotify playlist
    verify(spotifyService).addTracksToPlaylist(
        eq("decrypted_access_token"),
        eq("spotify-playlist-789"),
        eq(List.of("spotify:track:netease-track-1"))
    );
  }

  @Test
  void shouldReturnUnauthorizedWhenApprovingWithoutSession() throws Exception {
    // When & Then
    mockMvc.perform(post("/api/conversions/1/matches/1/approve"))
        .andExpect(status().isUnauthorized());

    verify(jobRepository, never()).findById(any());
    verify(matchRepository, never()).save(any());
  }

  @Test
  void shouldReturnForbiddenWhenApprovingOtherUsersMatch() throws Exception {
    // Given: Job belongs to different user
    User otherUser = new User();
    otherUser.setId(2L);
    job.setUser(otherUser);

    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));

    // When & Then
    mockMvc.perform(post("/api/conversions/1/matches/1/approve")
            .session(authenticatedSession))
        .andExpect(status().isForbidden());

    verify(jobRepository).findById(1L);
    verify(matchRepository, never()).findById(any());
    verify(matchRepository, never()).save(any());
  }

  @Test
  void shouldReturnBadRequestWhenMatchDoesNotBelongToJob() throws Exception {
    // Given: Match belongs to different job
    ConversionJob otherJob = new ConversionJob();
    otherJob.setId(2L);
    pendingMatch.setConversionJob(otherJob);

    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(matchRepository.findById(1L)).thenReturn(Optional.of(pendingMatch));

    // When & Then
    mockMvc.perform(post("/api/conversions/1/matches/1/approve")
            .session(authenticatedSession))
        .andExpect(status().isBadRequest());

    verify(jobRepository).findById(1L);
    verify(matchRepository).findById(1L);
    verify(matchRepository, never()).save(any());
    verify(neteaseService, never()).addTracksToPlaylist(any(), any(), any());
  }

  @Test
  void shouldReturnBadRequestWhenMatchHasNoDestinationTrack() throws Exception {
    // Given: Match has no destination track
    pendingMatch.setDestinationTrackId(null);

    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(matchRepository.findById(1L)).thenReturn(Optional.of(pendingMatch));

    // When & Then
    mockMvc.perform(post("/api/conversions/1/matches/1/approve")
            .session(authenticatedSession))
        .andExpect(status().isBadRequest());

    verify(matchRepository, never()).save(any());
  }

  @Test
  void shouldSkipMatch() throws Exception {
    // Given
    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(matchRepository.findById(1L)).thenReturn(Optional.of(pendingMatch));

    // When & Then
    mockMvc.perform(post("/api/conversions/1/matches/1/skip")
            .session(authenticatedSession))
        .andExpect(status().isOk());

    // Verify match was updated
    ArgumentCaptor<TrackMatch> matchCaptor = ArgumentCaptor.forClass(TrackMatch.class);
    verify(matchRepository).save(matchCaptor.capture());
    TrackMatch savedMatch = matchCaptor.getValue();
    assertEquals(MatchStatus.USER_SKIPPED, savedMatch.getStatus());
    assertNotNull(savedMatch.getReviewedAt());
  }

  @Test
  void shouldReturnUnauthorizedWhenSkippingWithoutSession() throws Exception {
    // When & Then
    mockMvc.perform(post("/api/conversions/1/matches/1/skip"))
        .andExpect(status().isUnauthorized());

    verify(jobRepository, never()).findById(any());
    verify(matchRepository, never()).save(any());
  }

  @Test
  void shouldReturnForbiddenWhenSkippingOtherUsersMatch() throws Exception {
    // Given: Job belongs to different user
    User otherUser = new User();
    otherUser.setId(2L);
    job.setUser(otherUser);

    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));

    // When & Then
    mockMvc.perform(post("/api/conversions/1/matches/1/skip")
            .session(authenticatedSession))
        .andExpect(status().isForbidden());

    verify(jobRepository).findById(1L);
    verify(matchRepository, never()).save(any());
  }

  @Test
  void shouldReturnBadRequestWhenSkippingMatchNotBelongingToJob() throws Exception {
    // Given: Match belongs to different job
    ConversionJob otherJob = new ConversionJob();
    otherJob.setId(2L);
    pendingMatch.setConversionJob(otherJob);

    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(matchRepository.findById(1L)).thenReturn(Optional.of(pendingMatch));

    // When & Then
    mockMvc.perform(post("/api/conversions/1/matches/1/skip")
            .session(authenticatedSession))
        .andExpect(status().isBadRequest());

    verify(jobRepository).findById(1L);
    verify(matchRepository).findById(1L);
    verify(matchRepository, never()).save(any());
  }

  @Test
  void shouldReturnNotFoundWhenSkippingNonexistentMatch() throws Exception {
    // Given
    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(matchRepository.findById(999L)).thenReturn(Optional.empty());

    // When & Then
    mockMvc.perform(post("/api/conversions/1/matches/999/skip")
            .session(authenticatedSession))
        .andExpect(status().isNotFound());

    verify(jobRepository).findById(1L);
    verify(matchRepository).findById(999L);
    verify(matchRepository, never()).save(any());
  }
}
