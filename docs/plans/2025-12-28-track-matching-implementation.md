# Track Matching Algorithm Implementation Plan

**Status:** ✅ COMPLETED - 2025-12-28

> **Note (2025-12-29):** Post-implementation, the scoring weights were rebalanced to prioritize
> track name and artist over duration. Current weights: Track name (40%), Artist (30%), Duration (30%).
> See `spotease-backend/README.md` and `MatchingService.java` for the current implementation.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement MatchingService and StringSimilarity utility for intelligent track matching between Spotify and NetEase Music.

**Architecture:** TDD approach with StringSimilarity utility class providing Levenshtein distance and normalization, and MatchingService orchestrating search, scoring, and threshold logic. Uses existing SpotifyService and NeteaseService for platform searches.

**Tech Stack:** Spring Boot 3.2+, JUnit 5, Mockito, Lombok

---

## Task 1: Create StringSimilarity Utility - Levenshtein Distance

**Files:**
- Create: `spotease-backend/src/test/java/com/spotease/util/StringSimilarityTest.java`
- Create: `spotease-backend/src/main/java/com/spotease/util/StringSimilarity.java`

**Step 1: Write the failing test for Levenshtein distance**

Create: `spotease-backend/src/test/java/com/spotease/util/StringSimilarityTest.java`

```java
package com.spotease.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StringSimilarityTest {

  @Test
  void shouldCalculateLevenshteinDistance() {
    // Classic examples
    assertThat(StringSimilarity.levenshteinDistance("kitten", "sitting")).isEqualTo(3);
    assertThat(StringSimilarity.levenshteinDistance("hello", "hello")).isEqualTo(0);
    assertThat(StringSimilarity.levenshteinDistance("abc", "xyz")).isEqualTo(3);
    assertThat(StringSimilarity.levenshteinDistance("", "test")).isEqualTo(4);
    assertThat(StringSimilarity.levenshteinDistance("test", "")).isEqualTo(4);
  }
}
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=StringSimilarityTest#shouldCalculateLevenshteinDistance`

Expected: FAIL with "cannot find symbol: class StringSimilarity"

**Step 3: Write minimal implementation**

Create: `spotease-backend/src/main/java/com/spotease/util/StringSimilarity.java`

```java
package com.spotease.util;

public class StringSimilarity {

  /**
   * Calculate Levenshtein distance between two strings.
   * Uses dynamic programming with space optimization.
   *
   * @param s1 first string
   * @param s2 second string
   * @return minimum number of single-character edits (insertions, deletions, substitutions)
   */
  public static int levenshteinDistance(String s1, String s2) {
    if (s1 == null) s1 = "";
    if (s2 == null) s2 = "";

    int len1 = s1.length();
    int len2 = s2.length();

    // Early exit for empty strings
    if (len1 == 0) return len2;
    if (len2 == 0) return len1;

    // Use two rows instead of full matrix for space efficiency
    int[] previousRow = new int[len2 + 1];
    int[] currentRow = new int[len2 + 1];

    // Initialize first row
    for (int j = 0; j <= len2; j++) {
      previousRow[j] = j;
    }

    // Calculate distances
    for (int i = 1; i <= len1; i++) {
      currentRow[0] = i;

      for (int j = 1; j <= len2; j++) {
        int cost = (s1.charAt(i - 1) == s2.charAt(j - 1)) ? 0 : 1;

        currentRow[j] = Math.min(
            Math.min(
                currentRow[j - 1] + 1,      // insertion
                previousRow[j] + 1          // deletion
            ),
            previousRow[j - 1] + cost       // substitution
        );
      }

      // Swap rows
      int[] temp = previousRow;
      previousRow = currentRow;
      currentRow = temp;
    }

    return previousRow[len2];
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=StringSimilarityTest#shouldCalculateLevenshteinDistance`

Expected: PASS

**Step 5: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/util/StringSimilarity.java \
        spotease-backend/src/test/java/com/spotease/util/StringSimilarityTest.java
git commit -m "feat: implement Levenshtein distance algorithm for string similarity"
```

---

## Task 2: Add String Normalization to StringSimilarity

**Files:**
- Modify: `spotease-backend/src/test/java/com/spotease/util/StringSimilarityTest.java`
- Modify: `spotease-backend/src/main/java/com/spotease/util/StringSimilarity.java`

**Step 1: Write the failing test for normalization**

Add to `StringSimilarityTest.java`:

```java
  @Test
  void shouldNormalizeString() {
    assertThat(StringSimilarity.normalize("Ed Sheeran (feat. Taylor Swift)"))
        .isEqualTo("ed sheeran feat taylor swift");

    assertThat(StringSimilarity.normalize("Shape Of You!!!"))
        .isEqualTo("shape of you");

    assertThat(StringSimilarity.normalize("Panic! At The Disco"))
        .isEqualTo("panic at the disco");

    assertThat(StringSimilarity.normalize("Artist ft. Someone"))
        .isEqualTo("artist feat someone");

    assertThat(StringSimilarity.normalize("Song featuring Artist"))
        .isEqualTo("song feat artist");
  }

  @Test
  void shouldHandleNullAndEmptyStrings() {
    assertThat(StringSimilarity.normalize(null)).isEqualTo("");
    assertThat(StringSimilarity.normalize("")).isEqualTo("");
    assertThat(StringSimilarity.normalize("   ")).isEqualTo("");
  }
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=StringSimilarityTest#shouldNormalizeString`

Expected: FAIL with "cannot find symbol: method normalize"

**Step 3: Write minimal implementation**

Add to `StringSimilarity.java`:

```java
  /**
   * Normalize string for comparison.
   * - Lowercase
   * - Trim whitespace
   * - Remove special characters
   * - Normalize featuring variants
   *
   * @param input string to normalize
   * @return normalized string
   */
  public static String normalize(String input) {
    if (input == null || input.trim().isEmpty()) {
      return "";
    }

    String result = input.toLowerCase().trim();

    // Normalize featuring variants first (before removing special chars)
    result = normalizeFeaturing(result);

    // Remove special characters and collapse whitespace
    result = removeSpecialChars(result);

    return result;
  }

  /**
   * Normalize featuring variants to standard "feat"
   */
  private static String normalizeFeaturing(String input) {
    return input
        .replaceAll("\\bfeaturing\\b", "feat")
        .replaceAll("\\bft\\.\\b", "feat")
        .replaceAll("\\bfeat\\.\\b", "feat");
  }

  /**
   * Remove special characters and collapse whitespace
   */
  private static String removeSpecialChars(String input) {
    // Remove: . , ! ? ; : ( ) " ' -
    return input
        .replaceAll("[.,!?;:()\"'\\-]", " ")
        .replaceAll("\\s+", " ")
        .trim();
  }
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=StringSimilarityTest`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/util/StringSimilarity.java \
        spotease-backend/src/test/java/com/spotease/util/StringSimilarityTest.java
git commit -m "feat: add string normalization for track/artist comparison"
```

---

## Task 3: Add Similarity Score Calculation to StringSimilarity

**Files:**
- Modify: `spotease-backend/src/test/java/com/spotease/util/StringSimilarityTest.java`
- Modify: `spotease-backend/src/main/java/com/spotease/util/StringSimilarity.java`

**Step 1: Write the failing test for similarity score**

Add to `StringSimilarityTest.java`:

```java
  @Test
  void shouldCalculateSimilarityScore() {
    // Identical strings = 1.0
    assertThat(StringSimilarity.calculateSimilarity("hello", "hello"))
        .isEqualTo(1.0);

    // Completely different = low score
    assertThat(StringSimilarity.calculateSimilarity("abc", "xyz"))
        .isLessThan(0.5);

    // Similar strings = high score
    assertThat(StringSimilarity.calculateSimilarity("Shape of You", "Shape Of You"))
        .isGreaterThan(0.9);

    // Normalized comparison
    assertThat(StringSimilarity.calculateSimilarity(
        "Ed Sheeran (feat. Taylor Swift)",
        "Ed Sheeran feat Taylor Swift"
    )).isGreaterThan(0.95);
  }

  @Test
  void shouldHandleEmptyStringsInSimilarity() {
    // Two empty strings = 1.0 (identical)
    assertThat(StringSimilarity.calculateSimilarity("", "")).isEqualTo(1.0);

    // One empty = 0.0
    assertThat(StringSimilarity.calculateSimilarity("test", "")).isEqualTo(0.0);
    assertThat(StringSimilarity.calculateSimilarity("", "test")).isEqualTo(0.0);
  }
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=StringSimilarityTest#shouldCalculateSimilarityScore`

Expected: FAIL with "cannot find symbol: method calculateSimilarity"

**Step 3: Write minimal implementation**

Add to `StringSimilarity.java`:

```java
  /**
   * Calculate similarity score between two strings (0.0 to 1.0).
   * Uses normalized Levenshtein distance.
   *
   * @param s1 first string
   * @param s2 second string
   * @return similarity score (1.0 = identical, 0.0 = completely different)
   */
  public static double calculateSimilarity(String s1, String s2) {
    String n1 = normalize(s1);
    String n2 = normalize(s2);

    // Both empty = identical
    if (n1.isEmpty() && n2.isEmpty()) {
      return 1.0;
    }

    // One empty = completely different
    if (n1.isEmpty() || n2.isEmpty()) {
      return 0.0;
    }

    int distance = levenshteinDistance(n1, n2);
    int maxLength = Math.max(n1.length(), n2.length());

    return 1.0 - ((double) distance / maxLength);
  }
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=StringSimilarityTest`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/util/StringSimilarity.java \
        spotease-backend/src/test/java/com/spotease/util/StringSimilarityTest.java
git commit -m "feat: add similarity score calculation using normalized Levenshtein distance"
```

---

## Task 4: Create MatchingService - Basic Structure

**Files:**
- Create: `spotease-backend/src/test/java/com/spotease/service/MatchingServiceTest.java`
- Create: `spotease-backend/src/main/java/com/spotease/service/MatchingService.java`

**Step 1: Write the failing test for basic structure**

Create: `spotease-backend/src/test/java/com/spotease/service/MatchingServiceTest.java`

```java
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
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=MatchingServiceTest#shouldReturnFailedMatchWhenNoSearchResults`

Expected: FAIL with "cannot find symbol: class MatchingService"

**Step 3: Write minimal implementation**

Create: `spotease-backend/src/main/java/com/spotease/service/MatchingService.java`

```java
package com.spotease.service;

import com.spotease.dto.netease.NeteaseTrack;
import com.spotease.dto.spotify.SpotifyTrack;
import com.spotease.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingService {

  private final SpotifyService spotifyService;
  private final NeteaseService neteaseService;

  public TrackMatch findBestMatch(
      Object sourceTrack,
      Platform destinationPlatform,
      String accessToken,
      ConversionJob job) {

    log.info("Starting match for track: {}", getTrackName(sourceTrack));

    // Search destination platform
    List<?> searchResults = search(sourceTrack, destinationPlatform, accessToken);

    // No results = failed match
    if (searchResults.isEmpty()) {
      log.info("No search results found");
      return createFailedMatch(job, sourceTrack, "No search results found");
    }

    // TODO: Implement scoring logic
    return createFailedMatch(job, sourceTrack, "Not implemented");
  }

  private List<?> search(Object sourceTrack, Platform platform, String accessToken) {
    String query = buildQuery(sourceTrack);

    if (platform == Platform.SPOTIFY) {
      return spotifyService.searchTrack(accessToken, query);
    } else {
      return neteaseService.searchTrack(accessToken, query);
    }
  }

  private String buildQuery(Object track) {
    String trackName = getTrackName(track);
    String firstArtist = getFirstArtist(track);
    return String.format("\"%s\" %s", trackName, firstArtist);
  }

  private TrackMatch createFailedMatch(ConversionJob job, Object sourceTrack, String errorMessage) {
    TrackMatch match = new TrackMatch();
    match.setConversionJob(job);
    match.setSourceTrackId(getTrackId(sourceTrack));
    match.setSourceTrackName(getTrackName(sourceTrack));
    match.setSourceArtist(getFirstArtist(sourceTrack));
    match.setSourceAlbum(getAlbumName(sourceTrack));
    match.setSourceDuration(getDurationInSeconds(sourceTrack));
    match.setSourceISRC(getIsrc(sourceTrack));
    match.setMatchConfidence(0.0);
    match.setStatus(MatchStatus.FAILED);
    match.setErrorMessage(errorMessage);
    return match;
  }

  // Helper methods for extracting data from SpotifyTrack or NeteaseTrack
  private String getTrackId(Object track) {
    if (track instanceof SpotifyTrack) {
      return ((SpotifyTrack) track).getId();
    } else if (track instanceof NeteaseTrack) {
      return ((NeteaseTrack) track).getId();
    }
    return null;
  }

  private String getTrackName(Object track) {
    if (track instanceof SpotifyTrack) {
      return ((SpotifyTrack) track).getName();
    } else if (track instanceof NeteaseTrack) {
      return ((NeteaseTrack) track).getName();
    }
    return null;
  }

  private String getFirstArtist(Object track) {
    if (track instanceof SpotifyTrack) {
      List<String> artists = ((SpotifyTrack) track).getArtists();
      return (artists != null && !artists.isEmpty()) ? artists.get(0) : "";
    } else if (track instanceof NeteaseTrack) {
      List<NeteaseTrack.NeteaseArtist> artists = ((NeteaseTrack) track).getArtists();
      return (artists != null && !artists.isEmpty()) ? artists.get(0).getName() : "";
    }
    return "";
  }

  private String getAlbumName(Object track) {
    if (track instanceof SpotifyTrack) {
      return ((SpotifyTrack) track).getAlbum();
    } else if (track instanceof NeteaseTrack) {
      NeteaseTrack.NeteaseAlbum album = ((NeteaseTrack) track).getAlbum();
      return album != null ? album.getName() : null;
    }
    return null;
  }

  private Integer getDurationInSeconds(Object track) {
    Integer durationMs = getDurationMs(track);
    return durationMs != null ? durationMs / 1000 : null;
  }

  private Integer getDurationMs(Object track) {
    if (track instanceof SpotifyTrack) {
      return ((SpotifyTrack) track).getDurationMs();
    } else if (track instanceof NeteaseTrack) {
      return ((NeteaseTrack) track).getDuration();
    }
    return null;
  }

  private String getIsrc(Object track) {
    if (track instanceof SpotifyTrack) {
      return ((SpotifyTrack) track).getIsrc();
    }
    return null;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=MatchingServiceTest#shouldReturnFailedMatchWhenNoSearchResults`

Expected: PASS

**Step 5: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/service/MatchingService.java \
        spotease-backend/src/test/java/com/spotease/service/MatchingServiceTest.java
git commit -m "feat: add MatchingService basic structure with search and failed match handling"
```

---

## Task 5: Implement Duration Scoring in MatchingService

**Files:**
- Modify: `spotease-backend/src/test/java/com/spotease/service/MatchingServiceTest.java`
- Modify: `spotease-backend/src/main/java/com/spotease/service/MatchingService.java`

**Step 1: Write the failing test for duration scoring**

Add to `MatchingServiceTest.java`:

```java
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
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=MatchingServiceTest#shouldScoreDurationCorrectly`

Expected: FAIL (low confidence score, not implemented yet)

**Step 3: Write minimal implementation**

Add to `MatchingService.java` after the `search` method:

```java
  private static final double AUTO_MATCH_THRESHOLD = 0.85;
  private static final double REVIEW_THRESHOLD = 0.60;

  // Update findBestMatch method to implement scoring:
  public TrackMatch findBestMatch(
      Object sourceTrack,
      Platform destinationPlatform,
      String accessToken,
      ConversionJob job) {

    log.info("Starting match for track: {}", getTrackName(sourceTrack));

    // Search destination platform
    List<?> searchResults = search(sourceTrack, destinationPlatform, accessToken);

    // No results = failed match
    if (searchResults.isEmpty()) {
      log.info("No search results found");
      return createFailedMatch(job, sourceTrack, "No search results found");
    }

    // Score all candidates and select best
    double bestScore = 0.0;
    Object bestCandidate = null;

    for (Object candidate : searchResults) {
      double score = scoreCandidate(sourceTrack, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    // Determine status based on score
    MatchStatus status = determineStatus(bestScore);

    log.info("Match found with confidence {}: {}", bestScore, getTrackName(bestCandidate));

    return createTrackMatch(job, sourceTrack, bestCandidate, bestScore, status);
  }

  private double scoreCandidate(Object source, Object candidate) {
    double totalScore = 0.0;
    double totalWeight = 0.0;

    // Duration score (60% weight if present)
    Integer sourceDuration = getDurationMs(source);
    Integer candidateDuration = getDurationMs(candidate);

    if (sourceDuration != null && candidateDuration != null) {
      double durationScore = scoreDuration(sourceDuration, candidateDuration);
      totalScore += durationScore * 0.6;
      totalWeight += 0.6;
      log.debug("Duration score: {}", durationScore);
    }

    // Track name score (20% weight, always required)
    String sourceName = getTrackName(source);
    String candidateName = getTrackName(candidate);
    double nameScore = scoreTrackName(sourceName, candidateName);
    totalScore += nameScore * 0.2;
    totalWeight += 0.2;
    log.debug("Track name score: {}", nameScore);

    // Artist score (20% weight if present)
    List<String> sourceArtists = getArtistNames(source);
    List<String> candidateArtists = getArtistNames(candidate);

    if (!sourceArtists.isEmpty() && !candidateArtists.isEmpty()) {
      double artistScore = scoreArtists(sourceArtists, candidateArtists);
      totalScore += artistScore * 0.2;
      totalWeight += 0.2;
      log.debug("Artist score: {}", artistScore);
    }

    // Normalize to 0.0-1.0 range
    double finalScore = totalWeight > 0 ? totalScore / totalWeight : 0.0;
    log.debug("Final score: {}", finalScore);

    return finalScore;
  }

  private double scoreDuration(Integer sourceMs, Integer candidateMs) {
    int sourceSec = sourceMs / 1000;
    int candidateSec = candidateMs / 1000;
    int diff = Math.abs(sourceSec - candidateSec);

    if (diff <= 3) {
      return 1.0;
    } else if (diff <= 10) {
      return 1.0 - ((diff - 3) / 7.0);
    } else {
      return 0.0;
    }
  }

  private double scoreTrackName(String source, String candidate) {
    // TODO: implement with StringSimilarity
    return 1.0;  // Temporary
  }

  private double scoreArtists(List<String> sourceArtists, List<String> candidateArtists) {
    // TODO: implement with StringSimilarity
    return 1.0;  // Temporary
  }

  private MatchStatus determineStatus(double score) {
    if (score >= AUTO_MATCH_THRESHOLD) {
      return MatchStatus.AUTO_MATCHED;
    } else if (score >= REVIEW_THRESHOLD) {
      return MatchStatus.PENDING_REVIEW;
    } else {
      return MatchStatus.FAILED;
    }
  }

  private TrackMatch createTrackMatch(
      ConversionJob job,
      Object sourceTrack,
      Object destinationTrack,
      double score,
      MatchStatus status) {

    TrackMatch match = new TrackMatch();
    match.setConversionJob(job);

    // Source track info
    match.setSourceTrackId(getTrackId(sourceTrack));
    match.setSourceTrackName(getTrackName(sourceTrack));
    match.setSourceArtist(getFirstArtist(sourceTrack));
    match.setSourceAlbum(getAlbumName(sourceTrack));
    match.setSourceDuration(getDurationInSeconds(sourceTrack));
    match.setSourceISRC(getIsrc(sourceTrack));

    // Destination track info
    match.setDestinationTrackId(getTrackId(destinationTrack));
    match.setDestinationTrackName(getTrackName(destinationTrack));
    match.setDestinationArtist(getFirstArtist(destinationTrack));

    // Match metadata
    match.setMatchConfidence(score);
    match.setStatus(status);

    if (status == MatchStatus.AUTO_MATCHED) {
      match.setAppliedAt(java.time.LocalDateTime.now());
    }

    return match;
  }

  private List<String> getArtistNames(Object track) {
    if (track instanceof SpotifyTrack) {
      List<String> artists = ((SpotifyTrack) track).getArtists();
      return artists != null ? artists : List.of();
    } else if (track instanceof NeteaseTrack) {
      List<NeteaseTrack.NeteaseArtist> artists = ((NeteaseTrack) track).getArtists();
      return artists != null
          ? artists.stream().map(NeteaseTrack.NeteaseArtist::getName).toList()
          : List.of();
    }
    return List.of();
  }
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=MatchingServiceTest#shouldScoreDurationCorrectly`

Expected: PASS

**Step 5: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/service/MatchingService.java \
        spotease-backend/src/test/java/com/spotease/service/MatchingServiceTest.java
git commit -m "feat: implement duration scoring with dynamic weight rebalancing"
```

---

## Task 6: Implement Track Name and Artist Scoring

**Files:**
- Modify: `spotease-backend/src/test/java/com/spotease/service/MatchingServiceTest.java`
- Modify: `spotease-backend/src/main/java/com/spotease/service/MatchingService.java`

**Step 1: Write the failing test for complete scoring**

Add to `MatchingServiceTest.java`:

```java
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
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=MatchingServiceTest#shouldScorePerfectMatch`

Expected: FAIL (scoring not complete, returns 1.0 always)

**Step 3: Write minimal implementation**

Update `MatchingService.java` to use StringSimilarity:

```java
import com.spotease.util.StringSimilarity;

// Update scoreTrackName method:
  private double scoreTrackName(String source, String candidate) {
    return StringSimilarity.calculateSimilarity(source, candidate);
  }

// Update scoreArtists method:
  private double scoreArtists(List<String> sourceArtists, List<String> candidateArtists) {
    if (sourceArtists.isEmpty() || candidateArtists.isEmpty()) {
      return 0.0;
    }

    double totalSimilarity = 0.0;

    for (String sourceArtist : sourceArtists) {
      double bestMatch = 0.0;
      for (String candidateArtist : candidateArtists) {
        double similarity = StringSimilarity.calculateSimilarity(sourceArtist, candidateArtist);
        bestMatch = Math.max(bestMatch, similarity);
      }
      totalSimilarity += bestMatch;
    }

    return totalSimilarity / sourceArtists.size();
  }
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=MatchingServiceTest`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/service/MatchingService.java \
        spotease-backend/src/test/java/com/spotease/service/MatchingServiceTest.java
git commit -m "feat: implement track name and artist scoring using StringSimilarity"
```

---

## Task 7: Implement 3-Tier Search Fallback Strategy

**Files:**
- Modify: `spotease-backend/src/test/java/com/spotease/service/MatchingServiceTest.java`
- Modify: `spotease-backend/src/main/java/com/spotease/service/MatchingService.java`

**Step 1: Write the failing test for search fallback**

Add to `MatchingServiceTest.java`:

```java
  @Test
  void shouldFallbackToTier2WhenTier1ReturnsEmpty() {
    SpotifyTrack source = createSpotifyTrack("1", "Test Song", List.of("Test Artist"), 240000);
    NeteaseTrack candidate = createNeteaseTrack("1", "Test Song", List.of("Test Artist"), 240000);

    // First call (tier 1 with quotes) returns empty
    when(neteaseService.searchTrack(anyString(), "\"Test Song\" Test Artist"))
        .thenReturn(List.of());

    // Second call (tier 2 without quotes) returns results
    when(neteaseService.searchTrack(anyString(), "Test Song Test Artist"))
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
    when(neteaseService.searchTrack(anyString(), "\"Test Song\" Test Artist"))
        .thenReturn(List.of());

    // Tier 2 returns empty
    when(neteaseService.searchTrack(anyString(), "Test Song Test Artist"))
        .thenReturn(List.of());

    // Tier 3 (name only) returns results
    when(neteaseService.searchTrack(anyString(), "Test Song"))
        .thenReturn(List.of(candidate));

    TrackMatch result = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    assertThat(result.getStatus()).isNotEqualTo(MatchStatus.FAILED);
    assertThat(result.getDestinationTrackId()).isNotNull();
  }
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=MatchingServiceTest#shouldFallbackToTier2WhenTier1ReturnsEmpty`

Expected: FAIL (fallback not implemented, test setup doesn't match current implementation)

**Step 3: Write minimal implementation**

Update `MatchingService.java` to implement fallback:

```java
  private static final int MAX_SEARCH_RESULTS = 5;

  // Replace the search method with searchWithFallback:
  private List<?> searchWithFallback(Object sourceTrack, Platform platform, String accessToken) {
    String trackName = getTrackName(sourceTrack);
    String firstArtist = getFirstArtist(sourceTrack);

    // Tier 1: "{track name}" {first artist}
    String query1 = String.format("\"%s\" %s", trackName, firstArtist);
    List<?> results = executeSearch(query1, platform, accessToken);
    if (!results.isEmpty()) {
      log.debug("Search tier 1 returned {} results", results.size());
      return limitResults(results);
    }

    // Tier 2: {track name} {first artist}
    String query2 = String.format("%s %s", trackName, firstArtist);
    results = executeSearch(query2, platform, accessToken);
    if (!results.isEmpty()) {
      log.debug("Search tier 2 returned {} results", results.size());
      return limitResults(results);
    }

    // Tier 3: {track name}
    results = executeSearch(trackName, platform, accessToken);
    log.debug("Search tier 3 returned {} results", results.size());
    return limitResults(results);
  }

  private List<?> executeSearch(String query, Platform platform, String accessToken) {
    if (platform == Platform.SPOTIFY) {
      return spotifyService.searchTrack(accessToken, query);
    } else {
      return neteaseService.searchTrack(accessToken, query);
    }
  }

  private List<?> limitResults(List<?> results) {
    return results.size() > MAX_SEARCH_RESULTS
        ? results.subList(0, MAX_SEARCH_RESULTS)
        : results;
  }

  // Update findBestMatch to use searchWithFallback:
  public TrackMatch findBestMatch(
      Object sourceTrack,
      Platform destinationPlatform,
      String accessToken,
      ConversionJob job) {

    log.info("Starting match for track: {}", getTrackName(sourceTrack));

    // Search with fallback strategy
    List<?> searchResults = searchWithFallback(sourceTrack, destinationPlatform, accessToken);

    // Rest remains the same...
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=MatchingServiceTest`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/service/MatchingService.java \
        spotease-backend/src/test/java/com/spotease/service/MatchingServiceTest.java
git commit -m "feat: implement 3-tier search fallback strategy with result limiting"
```

---

## Task 8: Add Tests for Missing Data Edge Cases

**Files:**
- Modify: `spotease-backend/src/test/java/com/spotease/service/MatchingServiceTest.java`

**Step 1: Write the failing test for missing duration**

Add to `MatchingServiceTest.java`:

```java
  @Test
  void shouldHandleMissingDurationWithWeightRebalancing() {
    // Source has duration, candidate doesn't
    SpotifyTrack source = createSpotifyTrack("1", "Test Song", List.of("Test Artist"), 240000);
    NeteaseTrack candidate = createNeteaseTrack("1", "Test Song", List.of("Test Artist"), null);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of(candidate));

    TrackMatch result = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    // Should still match based on name and artist (rebalanced to 50/50)
    assertThat(result.getMatchConfidence()).isGreaterThan(0.8);
    assertThat(result.getStatus()).isEqualTo(MatchStatus.AUTO_MATCHED);
  }

  @Test
  void shouldHandleMissingArtistWithWeightRebalancing() {
    // Source has artist, candidate doesn't
    SpotifyTrack source = createSpotifyTrack("1", "Test Song", List.of("Test Artist"), 240000);
    NeteaseTrack candidate = createNeteaseTrack("1", "Test Song", List.of(), 240000);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of(candidate));

    TrackMatch result = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    // Should still match based on duration and name (rebalanced to 75/25)
    assertThat(result.getMatchConfidence()).isGreaterThan(0.7);
  }

  @Test
  void shouldHandleMultipleArtists() {
    SpotifyTrack source = createSpotifyTrack("1", "Test Song",
        List.of("Ed Sheeran", "Taylor Swift"), 240000);
    NeteaseTrack candidate = createNeteaseTrack("1", "Test Song",
        List.of("Taylor Swift", "Ed Sheeran"), 240000);

    when(neteaseService.searchTrack(anyString(), anyString())).thenReturn(List.of(candidate));

    TrackMatch result = matchingService.findBestMatch(source, Platform.NETEASE, "token", job);

    // Should match well even with different artist order
    assertThat(result.getMatchConfidence()).isGreaterThan(0.9);
    assertThat(result.getStatus()).isEqualTo(MatchStatus.AUTO_MATCHED);
  }
```

**Step 2: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=MatchingServiceTest`

Expected: PASS (weight rebalancing already implemented in Task 5)

**Step 3: Commit**

```bash
git add spotease-backend/src/test/java/com/spotease/service/MatchingServiceTest.java
git commit -m "test: add edge case tests for missing data and multiple artists"
```

---

## Task 9: Update Search Services to Limit Results

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/service/SpotifyService.java:74`
- Modify: `spotease-backend/src/main/java/com/spotease/service/NeteaseService.java:127`

**Step 1: Update SpotifyService to limit to 5 results**

Modify `spotease-backend/src/main/java/com/spotease/service/SpotifyService.java` line 74:

```java
      SearchTracksRequest searchTracksRequest = spotifyApi
          .searchTracks(query)
          .limit(5)  // Changed from 10 to 5
          .build();
```

**Step 2: Update NeteaseService to limit to 5 results**

Modify `spotease-backend/src/main/java/com/spotease/service/NeteaseService.java` line 127:

```java
          .uri(uriBuilder -> uriBuilder
              .path("/cloudsearch")
              .queryParam("keywords", query)
              .queryParam("type", 1)  // 1 = single track
              .queryParam("limit", 5)  // Changed from 10 to 5
              .build())
```

**Step 3: Run full test suite**

Run: `cd spotease-backend && ./mvnw test`

Expected: PASS (all tests)

**Step 4: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/service/SpotifyService.java \
        spotease-backend/src/main/java/com/spotease/service/NeteaseService.java
git commit -m "refactor: limit search results to 5 for performance optimization"
```

---

## Task 10: Final Integration Test and Documentation

**Files:**
- Modify: `spotease-backend/README.md`

**Step 1: Run complete test suite**

Run: `cd spotease-backend && ./mvnw clean test`

Expected: All tests PASS

**Step 2: Update README with MatchingService documentation**

Add to `spotease-backend/README.md` after the services section:

```markdown
### Track Matching Algorithm

**MatchingService** implements intelligent track matching between Spotify and NetEase Music:

**Features:**
- Multi-factor scoring: Duration (60%), Track name (20%), Artist (20%)
- Dynamic weight rebalancing when data is missing
- 3-tier search fallback strategy for maximum match rate
- Confidence-based thresholds:
  - AUTO_MATCHED (≥0.85): Automatically added to destination playlist
  - PENDING_REVIEW (0.60-0.84): Requires user review
  - FAILED (<0.60): No confident match found

**String Similarity:**
- Levenshtein distance algorithm for string comparison
- Normalization: lowercase, remove special chars, normalize "feat"/"ft."
- Handles artist name variations and track title differences

**Search Strategy:**
- Tier 1: `"{track name}" {first artist}` (quoted search)
- Tier 2: `{track name} {first artist}` (unquoted search)
- Tier 3: `{track name}` (name only, fallback)

**Usage:**
```java
TrackMatch match = matchingService.findBestMatch(
    sourceTrack,           // SpotifyTrack or NeteaseTrack
    Platform.NETEASE,      // Destination platform
    "access-token",        // Platform access token
    conversionJob          // ConversionJob entity
);
```
```

**Step 3: Commit**

```bash
git add spotease-backend/README.md
git commit -m "docs: add track matching algorithm documentation to README"
```

---

## Task 11: Mark Implementation Plan as Complete

**Files:**
- Modify: `docs/plans/2025-12-28-track-matching-implementation.md`

**Step 1: Update plan status**

Add at top of plan file:

```markdown
**Status:** ✅ COMPLETED - 2025-12-28
```

**Step 2: Commit**

```bash
git add docs/plans/2025-12-28-track-matching-implementation.md
git commit -m "docs: mark track matching implementation plan as complete"
```

---

## Completion Checklist

- [ ] Task 1: StringSimilarity - Levenshtein distance implemented with tests
- [ ] Task 2: StringSimilarity - String normalization implemented with tests
- [ ] Task 3: StringSimilarity - Similarity score calculation implemented with tests
- [ ] Task 4: MatchingService - Basic structure with failed match handling
- [ ] Task 5: MatchingService - Duration scoring with dynamic rebalancing
- [ ] Task 6: MatchingService - Track name and artist scoring
- [ ] Task 7: MatchingService - 3-tier search fallback strategy
- [ ] Task 8: Edge case tests for missing data and multiple artists
- [ ] Task 9: Search services updated to limit results to 5
- [ ] Task 10: README documentation updated
- [ ] Task 11: Implementation plan marked complete

**Total Tasks:** 11
**Estimated Time:** 2-3 hours (following TDD approach)

---

## Next Steps

After completing this implementation:

1. **Integration with ConversionWorker** - Use MatchingService in async job processing
2. **Performance monitoring** - Track score distributions and match rates
3. **Threshold tuning** - Adjust based on real-world usage data
4. **API rate limiting** - Add backoff/retry for search API calls

---

**End of Implementation Plan**
