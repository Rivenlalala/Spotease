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

  @Test
  void shouldScorePerfectMatch() {
    // Identical track
    SpotifyTrack source = createSpotifyTrack("1", "Shape of You", List.of("Ed Sheeran"), 240000);
    NeteaseTrack candidate = createNeteaseTrack("1", "Shape of You", List.of("Ed Sheeran"), 240000);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of(candidate));

    TrackMatch result = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    assertThat(result.getMatchConfidence()).isGreaterThan(0.95);
    assertThat(result.getStatus()).isEqualTo(MatchStatus.AUTO_MATCHED);
  }

  @Test
  void shouldScoreHighConfidenceMatch() {
    // Slightly different name but same artist and duration
    SpotifyTrack source = createSpotifyTrack("1", "Shape of You", List.of("Ed Sheeran"), 240000);
    NeteaseTrack candidate = createNeteaseTrack("1", "Shape Of You", List.of("Ed Sheeran"), 241000);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of(candidate));

    TrackMatch result = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    assertThat(result.getMatchConfidence()).isGreaterThanOrEqualTo(0.85);
    assertThat(result.getStatus()).isEqualTo(MatchStatus.AUTO_MATCHED);
  }

  @Test
  void shouldScoreMediumConfidenceMatch() {
    // Different duration, slightly different name
    SpotifyTrack source = createSpotifyTrack("1", "Bohemian Rhapsody", List.of("Queen"), 354000);
    NeteaseTrack candidate = createNeteaseTrack("1", "Bohemian Rhapsody - Remastered", List.of("Queen"), 360000);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of(candidate));

    TrackMatch result = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    assertThat(result.getMatchConfidence()).isBetween(0.60, 0.84);
    assertThat(result.getStatus()).isEqualTo(MatchStatus.PENDING_REVIEW);
  }

  @Test
  void shouldScoreLowConfidenceMatch() {
    // Different artist (cover version)
    SpotifyTrack source = createSpotifyTrack("1", "Bohemian Rhapsody", List.of("Queen"), 354000);
    NeteaseTrack candidate = createNeteaseTrack("1", "Bohemian Rhapsody", List.of("Panic! at the Disco"), 320000);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of(candidate));

    TrackMatch result = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    assertThat(result.getMatchConfidence()).isLessThan(0.60);
    assertThat(result.getStatus()).isEqualTo(MatchStatus.FAILED);
  }

  @Test
  void shouldScoreArtistNamesSimilarity() {
    // Test artist scoring specifically
    // Same track name and duration, but different artist names
    SpotifyTrack source = createSpotifyTrack("1", "Yesterday", List.of("The Beatles"), 125000);
    NeteaseTrack perfectArtist = createNeteaseTrack("1", "Yesterday", List.of("The Beatles"), 125000);
    NeteaseTrack similarArtist = createNeteaseTrack("2", "Yesterday", List.of("Beatles"), 125000);
    NeteaseTrack differentArtist = createNeteaseTrack("3", "Yesterday", List.of("John Lennon"), 125000);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of(perfectArtist));
    TrackMatch perfectResult = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of(similarArtist));
    TrackMatch similarResult = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of(differentArtist));
    TrackMatch differentResult = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    // Perfect artist match should score highest
    assertThat(perfectResult.getMatchConfidence()).isGreaterThan(similarResult.getMatchConfidence());
    // Similar artist should score higher than different artist
    assertThat(similarResult.getMatchConfidence()).isGreaterThan(differentResult.getMatchConfidence());
  }

  @Test
  void shouldFallbackToTier2WhenTier1ReturnsEmpty() {
    SpotifyTrack source = createSpotifyTrack("1", "Test Song", List.of("Test Artist"), 240000);
    NeteaseTrack candidate = createNeteaseTrack("1", "Test Song", List.of("Test Artist"), 240000);

    // First call (tier 1 with quotes) returns empty
    when(neteaseService.searchTrack("\"Test Song\" Test Artist", "token"))
        .thenReturn(List.of());

    // Second call (tier 2 without quotes) returns results
    when(neteaseService.searchTrack("Test Song Test Artist", "token"))
        .thenReturn(List.of(candidate));

    TrackMatch result = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    assertThat(result.getStatus()).isNotEqualTo(MatchStatus.FAILED);
    assertThat(result.getDestinationTrackId()).isNotNull();
  }

  @Test
  void shouldFallbackToTier3WhenTier2ReturnsEmpty() {
    SpotifyTrack source = createSpotifyTrack("1", "Test Song", List.of("Test Artist"), 240000);
    NeteaseTrack candidate = createNeteaseTrack("1", "Test Song", List.of("Different Artist"), 240000);

    // Tier 1 returns empty
    when(neteaseService.searchTrack("\"Test Song\" Test Artist", "token"))
        .thenReturn(List.of());

    // Tier 2 returns empty
    when(neteaseService.searchTrack("Test Song Test Artist", "token"))
        .thenReturn(List.of());

    // Tier 3 (name only) returns results
    when(neteaseService.searchTrack("Test Song", "token"))
        .thenReturn(List.of(candidate));

    TrackMatch result = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    assertThat(result.getStatus()).isNotEqualTo(MatchStatus.FAILED);
    assertThat(result.getDestinationTrackId()).isNotNull();
  }
}
