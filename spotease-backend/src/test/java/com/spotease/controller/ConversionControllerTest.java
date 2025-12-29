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
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ConversionControllerTest {

  private MockMvc mockMvc;

  private ObjectMapper objectMapper;

  @Mock
  private ConversionService conversionService;

  @Mock
  private ConversionJobRepository jobRepository;

  @InjectMocks
  private ConversionController conversionController;

  private MockHttpSession authenticatedSession;
  private ConversionRequest request;
  private ConversionJob job;
  private User user;

  @BeforeEach
  void setUp() {
    // Set up MockMvc with standalone setup
    mockMvc = MockMvcBuilders.standaloneSetup(conversionController).build();
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

    // Create conversion request
    request = ConversionRequest.builder()
        .sourcePlatform(Platform.SPOTIFY)
        .sourcePlaylistId("spotify-playlist-123")
        .mode(ConversionMode.CREATE)
        .destinationPlaylistName("My New Playlist")
        .build();

    // Create conversion job
    job = new ConversionJob();
    job.setId(1L);
    job.setUser(user);
    job.setSourcePlatform(Platform.SPOTIFY);
    job.setSourcePlaylistId("spotify-playlist-123");
    job.setSourcePlaylistName("Original Playlist");
    job.setDestinationPlatform(Platform.NETEASE);
    job.setDestinationPlaylistName("My New Playlist");
    job.setMode(ConversionMode.CREATE);
    job.setStatus(JobStatus.QUEUED);
    job.setTotalTracks(10);
    job.setProcessedTracks(0);
    job.setHighConfidenceMatches(0);
    job.setLowConfidenceMatches(0);
    job.setFailedTracks(0);
    job.setCreatedAt(LocalDateTime.now());
  }

  @Test
  void createConversionJob_WithValidRequest_ReturnsCreatedJob() throws Exception {
    // Given
    when(conversionService.createJob(eq(1L), any(ConversionRequest.class)))
        .thenReturn(job);

    // When & Then
    mockMvc.perform(post("/api/conversions")
            .session(authenticatedSession)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id", is(1)))
        .andExpect(jsonPath("$.status", is("QUEUED")))
        .andExpect(jsonPath("$.sourcePlaylistName", is("Original Playlist")))
        .andExpect(jsonPath("$.destinationPlaylistName", is("My New Playlist")))
        .andExpect(jsonPath("$.totalTracks", is(10)))
        .andExpect(jsonPath("$.processedTracks", is(0)))
        .andExpect(jsonPath("$.highConfidenceMatches", is(0)))
        .andExpect(jsonPath("$.lowConfidenceMatches", is(0)))
        .andExpect(jsonPath("$.failedTracks", is(0)))
        .andExpect(jsonPath("$.createdAt", notNullValue()))
        .andExpect(jsonPath("$.completedAt", nullValue()));

    verify(conversionService).createJob(eq(1L), any(ConversionRequest.class));
  }

  @Test
  void createConversionJob_WithoutAuthentication_ReturnsUnauthorized() throws Exception {
    // Given: No session

    // When & Then
    mockMvc.perform(post("/api/conversions")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isUnauthorized());

    verify(conversionService, never()).createJob(any(), any());
  }

  @Test
  void createConversionJob_WithInvalidRequest_ReturnsBadRequest() throws Exception {
    // Given: Invalid request (missing required field)
    ConversionRequest invalidRequest = ConversionRequest.builder()
        .sourcePlatform(Platform.SPOTIFY)
        // Missing sourcePlaylistId
        .mode(ConversionMode.CREATE)
        .destinationPlaylistName("My Playlist")
        .build();

    // When & Then
    mockMvc.perform(post("/api/conversions")
            .session(authenticatedSession)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(invalidRequest)))
        .andExpect(status().isBadRequest());

    verify(conversionService, never()).createJob(any(), any());
  }

  @Test
  void getAllConversionJobs_WithAuthentication_ReturnsUserJobs() throws Exception {
    // Given
    ConversionJob job2 = new ConversionJob();
    job2.setId(2L);
    job2.setUser(user);
    job2.setSourcePlatform(Platform.NETEASE);
    job2.setSourcePlaylistId("netease-playlist-456");
    job2.setSourcePlaylistName("NetEase Playlist");
    job2.setDestinationPlatform(Platform.SPOTIFY);
    job2.setDestinationPlaylistName("Spotify Playlist");
    job2.setMode(ConversionMode.UPDATE);
    job2.setStatus(JobStatus.COMPLETED);
    job2.setTotalTracks(5);
    job2.setProcessedTracks(5);
    job2.setHighConfidenceMatches(4);
    job2.setLowConfidenceMatches(1);
    job2.setFailedTracks(0);
    job2.setCreatedAt(LocalDateTime.now());
    job2.setCompletedAt(LocalDateTime.now());

    List<ConversionJob> jobs = Arrays.asList(job, job2);
    when(jobRepository.findByUser_Id(1L)).thenReturn(jobs);

    // When & Then
    mockMvc.perform(get("/api/conversions")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(2)))
        .andExpect(jsonPath("$[0].id", is(1)))
        .andExpect(jsonPath("$[0].status", is("QUEUED")))
        .andExpect(jsonPath("$[1].id", is(2)))
        .andExpect(jsonPath("$[1].status", is("COMPLETED")));

    verify(jobRepository).findByUser_Id(1L);
  }

  @Test
  void getAllConversionJobs_WithoutAuthentication_ReturnsUnauthorized() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/conversions"))
        .andExpect(status().isUnauthorized());

    verify(jobRepository, never()).findByUser_Id(any());
  }

  @Test
  void getConversionJob_WithValidJobId_ReturnsJob() throws Exception {
    // Given
    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));

    // When & Then
    mockMvc.perform(get("/api/conversions/1")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id", is(1)))
        .andExpect(jsonPath("$.status", is("QUEUED")))
        .andExpect(jsonPath("$.sourcePlaylistName", is("Original Playlist")));

    verify(jobRepository).findById(1L);
  }

  @Test
  void getConversionJob_WithNonexistentJobId_ReturnsNotFound() throws Exception {
    // Given
    when(jobRepository.findById(999L)).thenReturn(Optional.empty());

    // When & Then
    mockMvc.perform(get("/api/conversions/999")
            .session(authenticatedSession))
        .andExpect(status().isNotFound());

    verify(jobRepository).findById(999L);
  }

  @Test
  void getConversionJob_WithUnauthorizedAccess_ReturnsForbidden() throws Exception {
    // Given: Job belongs to different user
    User otherUser = new User();
    otherUser.setId(2L);
    job.setUser(otherUser);

    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));

    // When & Then
    mockMvc.perform(get("/api/conversions/1")
            .session(authenticatedSession))
        .andExpect(status().isForbidden());

    verify(jobRepository).findById(1L);
  }

  @Test
  void getConversionJob_WithoutAuthentication_ReturnsUnauthorized() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/conversions/1"))
        .andExpect(status().isUnauthorized());

    verify(jobRepository, never()).findById(any());
  }

  @Test
  void deleteConversionJob_WithValidJobId_ReturnsNoContent() throws Exception {
    // Given
    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));

    // When & Then
    mockMvc.perform(delete("/api/conversions/1")
            .session(authenticatedSession))
        .andExpect(status().isNoContent());

    verify(jobRepository).findById(1L);
    verify(jobRepository).delete(job);
  }

  @Test
  void deleteConversionJob_WithNonexistentJobId_ReturnsNotFound() throws Exception {
    // Given
    when(jobRepository.findById(999L)).thenReturn(Optional.empty());

    // When & Then
    mockMvc.perform(delete("/api/conversions/999")
            .session(authenticatedSession))
        .andExpect(status().isNotFound());

    verify(jobRepository).findById(999L);
    verify(jobRepository, never()).delete(any());
  }

  @Test
  void deleteConversionJob_WithUnauthorizedAccess_ReturnsForbidden() throws Exception {
    // Given: Job belongs to different user
    User otherUser = new User();
    otherUser.setId(2L);
    job.setUser(otherUser);

    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));

    // When & Then
    mockMvc.perform(delete("/api/conversions/1")
            .session(authenticatedSession))
        .andExpect(status().isForbidden());

    verify(jobRepository).findById(1L);
    verify(jobRepository, never()).delete(any());
  }

  @Test
  void deleteConversionJob_WithoutAuthentication_ReturnsUnauthorized() throws Exception {
    // When & Then
    mockMvc.perform(delete("/api/conversions/1"))
        .andExpect(status().isUnauthorized());

    verify(jobRepository, never()).findById(any());
    verify(jobRepository, never()).delete(any());
  }
}
