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

  @Mock
  private com.spotease.util.TokenEncryption tokenEncryption;

  @Mock
  private com.spotease.worker.ConversionWorker conversionWorker;

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

    // Mock token decryption
    when(tokenEncryption.decrypt("encrypted-spotify-token")).thenReturn("decrypted-spotify-token");

    SpotifyPlaylist sourcePlaylist = new SpotifyPlaylist();
    sourcePlaylist.setId("playlist123");
    sourcePlaylist.setName("Source Playlist");
    sourcePlaylist.setTrackCount(10);
    when(spotifyService.getPlaylistById("decrypted-spotify-token", "playlist123"))
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

  @Test
  void shouldTriggerWorkerAfterJobCreation() {
    // Given
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(tokenEncryption.decrypt("encrypted-spotify-token")).thenReturn("decrypted-spotify-token");

    SpotifyPlaylist sourcePlaylist = new SpotifyPlaylist();
    sourcePlaylist.setId("playlist123");
    sourcePlaylist.setName("Source Playlist");
    sourcePlaylist.setTrackCount(10);
    when(spotifyService.getPlaylistById("decrypted-spotify-token", "playlist123"))
        .thenReturn(sourcePlaylist);

    ConversionJob savedJob = new ConversionJob();
    savedJob.setId(1L);
    when(jobRepository.save(any())).thenReturn(savedJob);

    // When
    conversionService.createJob(1L, request);

    // Then
    verify(conversionWorker).processConversionJob(1L);
  }
}
