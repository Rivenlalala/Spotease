package com.spotease.service;

import com.spotease.dto.netease.NeteaseTrack;
import com.spotease.dto.spotify.SpotifyTrack;
import com.spotease.model.ConversionJob;
import com.spotease.model.MatchStatus;
import com.spotease.model.Platform;
import com.spotease.model.TrackMatch;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchingServiceTest {

  @Mock
  private SpotifyService spotifyService;

  @Mock
  private NeteaseService neteaseService;

  @InjectMocks
  private MatchingService matchingService;

  private ConversionJob job;

  @BeforeEach
  void setUp() {
    job = new ConversionJob();
    job.setId(1L);
  }

  @Test
  void shouldReturnFailedMatchWhenNoSearchResults() {
    // Given
    SpotifyTrack sourceTrack = createSpotifyTrack("1", "Shape of You", List.of("Ed Sheeran"), 240000);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of());

    // When
    TrackMatch result = matchingService.findBestMatch(
        sourceTrack,
        Platform.NETEASE,
        "test-token",
        job
    );

    // Then
    assertThat(result.getStatus()).isEqualTo(MatchStatus.FAILED);
    assertThat(result.getMatchConfidence()).isEqualTo(0.0);
    assertThat(result.getDestinationTrackId()).isNull();
  }

  private SpotifyTrack createSpotifyTrack(String id, String name, List<String> artists, Integer durationMs) {
    SpotifyTrack track = new SpotifyTrack();
    track.setId(id);
    track.setName(name);
    track.setArtists(artists);
    track.setDurationMs(durationMs);
    return track;
  }
}
