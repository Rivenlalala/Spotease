package com.spotease.worker;

import com.spotease.dto.netease.NeteaseTrack;
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

import org.mockito.ArgumentCaptor;

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
    when(jobRepository.save(any(ConversionJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
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

    when(neteaseService.createPlaylist(eq("decrypted-cookie"), eq("New Playlist")))
        .thenReturn("created-playlist-id");

    // When
    conversionWorker.processConversionJob(1L);

    // Then
    // Verify job repository was called multiple times to save progress
    verify(jobRepository, atLeast(5)).save(any(ConversionJob.class));

    // Verify final state of job
    assertThat(job.getStatus()).isEqualTo(JobStatus.COMPLETED);
    assertThat(job.getProcessedTracks()).isEqualTo(2);
    assertThat(job.getHighConfidenceMatches()).isEqualTo(2);
    assertThat(job.getDestinationPlaylistId()).isEqualTo("created-playlist-id");

    verify(trackMatchRepository, times(2)).save(any(TrackMatch.class));
    verify(neteaseService).createPlaylist(eq("decrypted-cookie"), eq("New Playlist"));
    verify(neteaseService).addTracksToPlaylist(eq("decrypted-cookie"), eq("created-playlist-id"), anyList());
    verify(webSocketService, atLeast(2)).sendJobUpdate(any(ConversionJob.class));
    verify(webSocketService).sendJobComplete(any(ConversionJob.class));
  }

  @Test
  void shouldHandlePendingReviewTracks() {
    // Given
    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(jobRepository.save(any(ConversionJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
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

    when(neteaseService.createPlaylist(eq("decrypted-cookie"), eq("New Playlist")))
        .thenReturn("created-playlist-id");

    // When
    conversionWorker.processConversionJob(1L);

    // Then
    // Verify job repository was called multiple times
    verify(jobRepository, atLeast(3)).save(any(ConversionJob.class));

    // Verify final state of job
    assertThat(job.getStatus()).isEqualTo(JobStatus.REVIEW_PENDING);
    assertThat(job.getLowConfidenceMatches()).isEqualTo(1);
    assertThat(job.getProcessedTracks()).isEqualTo(1);

    verify(neteaseService, never()).addTracksToPlaylist(any(), any(), any());
  }

  @Test
  void shouldSkipExistingTracksInUpdateMode() {
    // Given
    job.setMode(ConversionMode.UPDATE);
    job.setDestinationPlaylistId("existing-playlist-id");

    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(jobRepository.save(any(ConversionJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
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

  @Test
  void shouldHandleErrorsGracefully() {
    // Given
    when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
    when(jobRepository.save(any(ConversionJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(tokenEncryption.decrypt(any())).thenReturn("decrypted-token");
    when(neteaseService.createPlaylist(any(), any())).thenReturn("created-playlist-id");
    when(spotifyService.getPlaylistTracks(any(), any()))
        .thenThrow(new RuntimeException("Spotify API error"));

    // When
    conversionWorker.processConversionJob(1L);

    // Then
    // Verify job was saved multiple times (PROCESSING, FAILED)
    ArgumentCaptor<ConversionJob> jobCaptor = ArgumentCaptor.forClass(ConversionJob.class);
    verify(jobRepository, atLeastOnce()).save(jobCaptor.capture());

    // Verify that at least one save had FAILED status
    assertThat(jobCaptor.getAllValues())
        .anyMatch(j -> j.getStatus() == JobStatus.FAILED);

    verify(webSocketService).sendJobError(any(ConversionJob.class), anyString());
  }
}
