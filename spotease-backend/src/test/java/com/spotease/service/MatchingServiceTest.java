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

  @Test
  void shouldScoreDurationCorrectly() {
    // Perfect match (≤3 seconds)
    SpotifyTrack source1 = createSpotifyTrack("1", "Test", List.of("Artist"), 240000);
    NeteaseTrack candidate1 = createNeteaseTrack("1", "Test", List.of("Artist"), 242000);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of(candidate1));

    TrackMatch result1 = matchingService.findBestMatch(source1, Platform.NETEASE, "token", job);

    // Should get high score due to perfect duration match
    assertThat(result1.getMatchConfidence()).isGreaterThan(0.8);

    // Large difference (>10 seconds)
    SpotifyTrack source2 = createSpotifyTrack("2", "Test", List.of("Artist"), 240000);
    NeteaseTrack candidate2 = createNeteaseTrack("2", "Test", List.of("Artist"), 260000);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of(candidate2));

    TrackMatch result2 = matchingService.findBestMatch(source2, Platform.NETEASE, "token", job);

    // Should get lower score due to duration mismatch
    assertThat(result2.getMatchConfidence()).isLessThan(result1.getMatchConfidence());
  }

  private SpotifyTrack createSpotifyTrack(String id, String name, List<String> artists, Integer durationMs) {
    SpotifyTrack track = new SpotifyTrack();
    track.setId(id);
    track.setName(name);
    track.setArtists(artists);
    track.setDurationMs(durationMs);
    return track;
  }

  private NeteaseTrack createNeteaseTrack(String id, String name, List<String> artistNames, Integer durationMs) {
    NeteaseTrack track = new NeteaseTrack();
    track.setId(id);
    track.setName(name);

    List<NeteaseTrack.NeteaseArtist> artists = artistNames.stream()
        .map(artistName -> {
          NeteaseTrack.NeteaseArtist artist = new NeteaseTrack.NeteaseArtist();
          artist.setName(artistName);
          return artist;
        })
        .toList();
    track.setArtists(artists);
    track.setDuration(durationMs);

    return track;
  }
}
