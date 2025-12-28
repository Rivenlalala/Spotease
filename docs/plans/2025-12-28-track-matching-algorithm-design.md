# Track Matching Algorithm Design

**Date:** 2025-12-28
**Status:** Design Complete
**Component:** MatchingService + StringSimilarity utility

---

## Overview

The track matching algorithm finds the best destination platform match for a source track during playlist conversions between Spotify and NetEase Music. It uses multi-factor scoring based on duration, track name, and artist similarity to determine match confidence.

**Key Design Decisions:**
- No ISRC matching (NetEase doesn't provide ISRC data)
- Album name excluded from scoring (too variable between platforms)
- Top 5 search results per query (performance optimization)
- Hardcoded weights and thresholds (can externalize later if needed)
- Dynamic weight rebalancing when data is missing

---

## Architecture

### Components

**1. MatchingService** (`com.spotease.service`)
- Core matching orchestrator
- Receives source track and destination platform info
- Delegates search to SpotifyService or NeteaseService
- Scores candidates using multi-factor algorithm
- Returns TrackMatch entity with best match and confidence

**2. StringSimilarity** (`com.spotease.util`)
- Levenshtein distance implementation
- String normalization utilities
- Reusable for track name and artist comparisons

**3. Platform Services** (existing)
- SpotifyService.searchTrack()
- NeteaseService.searchTrack()
- Return List of track DTOs

### Data Flow

```
ConversionWorker
  ↓
MatchingService.findBestMatch(sourceTrack, destinationPlatform, accessToken)
  ↓
Build search query → Try search with fallbacks (3 tiers)
  ↓
Score each result (1-5 candidates)
  ↓
Select best match → Apply thresholds
  ↓
TrackMatch entity (confidence, status, destination track info)
```

---

## Search Strategy

### Three-Tier Search with Fallbacks

The service uses progressive fallback to maximize match rate while staying efficient. Each tier is attempted only if the previous tier returns zero results.

**Tier 1: Specific Quoted Search** (first attempt)
- Query format: `"{track name}" {first artist}`
- Example: `"Shape of You" Ed Sheeran`
- Rationale: Quoted phrase matching + first artist narrows results
- Expected success rate: ~85-90%

**Tier 2: Unquoted Search** (if Tier 1 returns 0 results)
- Query format: `{track name} {first artist}`
- Example: `Shape of You Ed Sheeran`
- Rationale: More flexible, handles cases where quotes interfere
- Catches: Special characters, platform-specific search quirks

**Tier 3: Track Name Only** (if Tier 2 returns 0 results)
- Query format: `{track name}`
- Example: `Shape of You`
- Rationale: Last resort for missing/incorrect artist metadata
- Returns broader results but scoring filters poor matches

**Implementation Notes:**
- Stop at first tier that returns results (don't try all three every time)
- Each search limited to 5 results maximum
- Artist extraction:
  - Spotify: `artists.get(0)` (List&lt;String&gt;)
  - NetEase: `artists.get(0).getName()` (List&lt;NeteaseArtist&gt;)
- Log which tier succeeded for monitoring

**Failure Case:**
- All three tiers return 0 results → TrackMatch with status=FAILED, matchConfidence=0.0

---

## Scoring Algorithm

### Multi-Factor Scoring

Each search result candidate is scored using three factors:

**Factor 1: Duration Match (60% weight)**

Convert both durations to seconds (both platforms use milliseconds in DTOs):
```
sourceDurationSec = sourceDurationMs / 1000
candidateDurationSec = candidateDurationMs / 1000
diff = |sourceDurationSec - candidateDurationSec|
```

Scoring formula:
- ≤3 seconds difference: **1.0** (perfect match)
- 3-10 seconds difference: **Linear falloff** = `1.0 - ((diff - 3) / 7.0)`
- >10 seconds difference: **0.0** (no credit)

Example: 5 seconds difference → `1.0 - ((5-3)/7.0)` = **0.714**

**Factor 2: Track Name Similarity (20% weight)**

1. Normalize both track names (see normalization below)
2. Calculate Levenshtein distance
3. Convert to similarity score: `1.0 - (distance / maxLength)`

Example: "Shape of You" vs "Shape Of You" → distance ≈ 0, similarity ≈ **1.0**

**Factor 3: Artist Similarity (20% weight)**

1. Extract all artist names from source and candidate
   - Spotify: List&lt;String&gt; directly
   - NetEase: `artists.stream().map(NeteaseArtist::getName).collect(toList())`
2. Normalize each artist name
3. For each source artist, find best match in candidate artists (highest Levenshtein similarity)
4. Average the best matches across all source artists

Example:
- Source: ["Ed Sheeran", "Taylor Swift"]
- Candidate: ["Taylor Swift", "Ed Sheeran"]
- Best matches: [1.0, 1.0], average = **1.0**

### String Normalization

Applied before all Levenshtein comparisons:

1. Convert to lowercase
2. Trim leading/trailing whitespace
3. Remove special characters: `. , ! ? ; : ( ) " ' -`
4. Normalize featuring variants: "feat.", "ft.", "featuring" → "feat"

Example: `"Ed Sheeran (feat. Taylor Swift)"` → `"ed sheeran feat taylor swift"`

### Final Score Calculation

**Standard formula** (all factors present):
```java
finalScore = (durationScore * 0.6) + (trackNameScore * 0.2) + (artistScore * 0.2)
```

**Dynamic Weight Rebalancing** (when data missing):

If duration is missing:
```java
finalScore = (trackNameScore * 0.5) + (artistScore * 0.5)
```

If artist is missing:
```java
finalScore = (durationScore * 0.75) + (trackNameScore * 0.25)
```

If track name is missing:
- **Hard failure** → status=FAILED
- Track name is essential for searching

If multiple factors missing (duration AND artist):
- **Hard failure** → status=FAILED
- Need at least two factors for reasonable matching

**Implementation:**
```java
double totalWeight = 0.0;
double totalScore = 0.0;

if (hasDuration) {
    totalScore += durationScore * 0.6;
    totalWeight += 0.6;
}
if (hasArtist) {
    totalScore += artistScore * 0.2;
    totalWeight += 0.2;
}
// track name always required
totalScore += trackNameScore * 0.2;
totalWeight += 0.2;

finalScore = totalScore / totalWeight;  // normalizes to 0.0-1.0
```

---

## Threshold Logic

After scoring all candidates, select the one with highest score and apply threshold rules:

### Status Determination

**Score ≥ 0.85 → AUTO_MATCHED**
- High confidence match
- Immediately added to destination playlist during worker processing
- TrackMatch.status = AUTO_MATCHED
- TrackMatch.appliedAt = now
- No user review needed

**Score 0.60 - 0.84 → PENDING_REVIEW**
- Medium confidence match
- TrackMatch.status = PENDING_REVIEW
- Store top candidate info in destinationTrackId/Name/Artist fields
- User reviews and approves/skips later
- Job status becomes REVIEW_PENDING when all tracks processed

**Score < 0.60 → FAILED**
- Low confidence, no good match found
- TrackMatch.status = FAILED
- destinationTrackId = null
- errorMessage = "No confident match found (best score: {score})"
- Added to review queue for manual search

### TrackMatch Entity Population

```java
trackMatch.setMatchConfidence(bestScore);
trackMatch.setStatus(determinedStatus);
trackMatch.setDestinationTrackId(bestCandidate.getId());
trackMatch.setDestinationTrackName(bestCandidate.getName());
trackMatch.setDestinationArtist(extractFirstArtistName(bestCandidate));

// Source track info (already set by ConversionWorker)
// trackMatch.setSourceTrackId(...)
// trackMatch.setSourceTrackName(...)
// trackMatch.setSourceArtist(...)
// trackMatch.setSourceAlbum(...)
// trackMatch.setSourceDuration(...)
// trackMatch.setSourceISRC(...) // Spotify only, nullable
```

---

## Error Handling

### API Failures

**Network timeout/errors:**
- Let exception propagate to ConversionWorker
- ConversionWorker handles retry logic with exponential backoff
- After 3 retries, create TrackMatch with status=FAILED and errorMessage
- Keeps MatchingService focused on matching logic, not retry mechanics

### Empty/Invalid Track Data

**Missing track name:**
- If source track name is null/empty → status=FAILED
- errorMessage = "Invalid source track: missing name"
- Skip search attempt entirely

**Missing artist data:**
- If artists list is null/empty → attempt search with track name only (Tier 3)
- Artist similarity score = 0.0
- Apply dynamic weight rebalancing (duration 75%, track name 25%)
- Can still match on duration + track name

**Missing duration:**
- If source or candidate duration is null → duration score = 0.0
- Apply dynamic weight rebalancing (track name 50%, artist 50%)
- Can still match on track name + artist similarity

### Platform-Specific Handling

**Spotify → NetEase:**
- Artist extraction: `artists` (List&lt;String&gt;) directly
- ISRC field ignored (not used in algorithm)
- Duration in milliseconds (standard)

**NetEase → Spotify:**
- Artist extraction: `artists.stream().map(NeteaseArtist::getName).collect(toList())`
- Duration in milliseconds (standard)
- No special handling needed

### Boundary Cases

- **Zero search results after all 3 tiers:** status=FAILED, matchConfidence=0.0
- **Single search result:** Still score it (might be low confidence)
- **Score ties:** Select first candidate (search rankings already favor relevance)

---

## Class Structure

### StringSimilarity.java

**Package:** `com.spotease.util`

```java
public class StringSimilarity {

  /**
   * Calculate similarity between two strings (0.0 = different, 1.0 = identical)
   * Uses normalized Levenshtein distance
   */
  public static double calculateSimilarity(String s1, String s2) {
    String n1 = normalize(s1);
    String n2 = normalize(s2);
    int distance = levenshteinDistance(n1, n2);
    int maxLength = Math.max(n1.length(), n2.length());
    return maxLength == 0 ? 1.0 : 1.0 - ((double) distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  public static int levenshteinDistance(String s1, String s2) {
    // Standard dynamic programming implementation
    // O(n*m) time, O(min(n,m)) space
  }

  /**
   * Normalize string for comparison
   */
  public static String normalize(String input) {
    if (input == null || input.isEmpty()) {
      return "";
    }

    String result = input.toLowerCase();
    result = result.trim();
    result = normalizeFeaturing(result);
    result = removeSpecialChars(result);

    return result;
  }

  private static String removeSpecialChars(String input) {
    // Remove: . , ! ? ; : ( ) " ' -
    return input.replaceAll("[.,!?;:()\"'\\-]", " ")
                .replaceAll("\\s+", " ")
                .trim();
  }

  private static String normalizeFeaturing(String input) {
    return input.replaceAll("\\bfeaturing\\b", "feat")
                .replaceAll("\\bft\\.\\b", "feat")
                .replaceAll("\\bfeat\\.\\b", "feat");
  }
}
```

### MatchingService.java

**Package:** `com.spotease.service`

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingService {

  private final SpotifyService spotifyService;
  private final NeteaseService neteaseService;

  // Constants
  private static final double AUTO_MATCH_THRESHOLD = 0.85;
  private static final double REVIEW_THRESHOLD = 0.60;
  private static final int MAX_SEARCH_RESULTS = 5;

  /**
   * Find best match for source track on destination platform
   *
   * @param sourceTrack SpotifyTrack or NeteaseTrack
   * @param destinationPlatform SPOTIFY or NETEASE
   * @param accessToken Access token for destination platform
   * @param job ConversionJob for building TrackMatch entity
   * @return TrackMatch with best match and confidence score
   */
  public TrackMatch findBestMatch(
      Object sourceTrack,
      Platform destinationPlatform,
      String accessToken,
      ConversionJob job) {

    log.info("Starting match for track: {} by {}",
        getTrackName(sourceTrack), getFirstArtist(sourceTrack));

    // Validate source track
    if (!isValidSourceTrack(sourceTrack)) {
      return createFailedMatch(job, sourceTrack, "Invalid source track data");
    }

    // Search with fallback strategy
    List<?> searchResults = searchWithFallback(
        sourceTrack, destinationPlatform, accessToken);

    if (searchResults.isEmpty()) {
      log.info("No match found after fallback searches");
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

    // Determine status and create TrackMatch
    MatchStatus status = determineStatus(bestScore);

    log.info("Match found with confidence {}: {}",
        bestScore, getTrackName(bestCandidate));

    return createTrackMatch(job, sourceTrack, bestCandidate, bestScore, status);
  }

  /**
   * Search with 3-tier fallback strategy
   */
  private List<?> searchWithFallback(
      Object sourceTrack,
      Platform destinationPlatform,
      String accessToken) {

    String trackName = getTrackName(sourceTrack);
    String firstArtist = getFirstArtist(sourceTrack);

    // Tier 1: "{track name}" {first artist}
    String query1 = String.format("\"%s\" %s", trackName, firstArtist);
    List<?> results = executeSearch(query1, destinationPlatform, accessToken);
    if (!results.isEmpty()) {
      log.debug("Search tier 1 returned {} results", results.size());
      return results;
    }

    // Tier 2: {track name} {first artist}
    String query2 = String.format("%s %s", trackName, firstArtist);
    results = executeSearch(query2, destinationPlatform, accessToken);
    if (!results.isEmpty()) {
      log.debug("Search tier 2 returned {} results", results.size());
      return results;
    }

    // Tier 3: {track name}
    results = executeSearch(trackName, destinationPlatform, accessToken);
    log.debug("Search tier 3 returned {} results", results.size());
    return results;
  }

  /**
   * Execute search on destination platform
   */
  private List<?> executeSearch(
      String query,
      Platform platform,
      String accessToken) {

    if (platform == Platform.SPOTIFY) {
      return spotifyService.searchTrack(accessToken, query);
    } else {
      return neteaseService.searchTrack(accessToken, query);
    }
  }

  /**
   * Score candidate against source track
   */
  private double scoreCandidate(Object source, Object candidate) {
    double totalScore = 0.0;
    double totalWeight = 0.0;

    // Duration score (60% weight if present)
    Integer sourceDuration = getDuration(source);
    Integer candidateDuration = getDuration(candidate);
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

  /**
   * Score duration match
   */
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

  /**
   * Score track name similarity
   */
  private double scoreTrackName(String source, String candidate) {
    return StringSimilarity.calculateSimilarity(source, candidate);
  }

  /**
   * Score artist similarity
   */
  private double scoreArtists(List<String> sourceArtists, List<String> candidateArtists) {
    double totalSimilarity = 0.0;

    for (String sourceArtist : sourceArtists) {
      double bestMatch = 0.0;
      for (String candidateArtist : candidateArtists) {
        double similarity = StringSimilarity.calculateSimilarity(
            sourceArtist, candidateArtist);
        bestMatch = Math.max(bestMatch, similarity);
      }
      totalSimilarity += bestMatch;
    }

    return sourceArtists.isEmpty() ? 0.0 : totalSimilarity / sourceArtists.size();
  }

  /**
   * Determine match status based on score
   */
  private MatchStatus determineStatus(double score) {
    if (score >= AUTO_MATCH_THRESHOLD) {
      return MatchStatus.AUTO_MATCHED;
    } else if (score >= REVIEW_THRESHOLD) {
      return MatchStatus.PENDING_REVIEW;
    } else {
      return MatchStatus.FAILED;
    }
  }

  /**
   * Create TrackMatch entity with match results
   */
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
    match.setSourceDuration(getDuration(sourceTrack));
    match.setSourceISRC(getIsrc(sourceTrack));

    // Destination track info
    match.setDestinationTrackId(getTrackId(destinationTrack));
    match.setDestinationTrackName(getTrackName(destinationTrack));
    match.setDestinationArtist(getFirstArtist(destinationTrack));

    // Match metadata
    match.setMatchConfidence(score);
    match.setStatus(status);

    if (status == MatchStatus.AUTO_MATCHED) {
      match.setAppliedAt(LocalDateTime.now());
    }

    return match;
  }

  /**
   * Create failed TrackMatch
   */
  private TrackMatch createFailedMatch(
      ConversionJob job,
      Object sourceTrack,
      String errorMessage) {

    TrackMatch match = new TrackMatch();
    match.setConversionJob(job);

    // Source track info
    match.setSourceTrackId(getTrackId(sourceTrack));
    match.setSourceTrackName(getTrackName(sourceTrack));
    match.setSourceArtist(getFirstArtist(sourceTrack));
    match.setSourceAlbum(getAlbumName(sourceTrack));
    match.setSourceDuration(getDuration(sourceTrack));
    match.setSourceISRC(getIsrc(sourceTrack));

    // No destination match
    match.setDestinationTrackId(null);
    match.setDestinationTrackName(null);
    match.setDestinationArtist(null);

    // Match metadata
    match.setMatchConfidence(0.0);
    match.setStatus(MatchStatus.FAILED);
    match.setErrorMessage(errorMessage);

    return match;
  }

  // Helper methods to extract data from SpotifyTrack or NeteaseTrack
  private boolean isValidSourceTrack(Object track) { /* ... */ }
  private String getTrackId(Object track) { /* ... */ }
  private String getTrackName(Object track) { /* ... */ }
  private String getFirstArtist(Object track) { /* ... */ }
  private List<String> getArtistNames(Object track) { /* ... */ }
  private String getAlbumName(Object track) { /* ... */ }
  private Integer getDuration(Object track) { /* ... */ }
  private String getIsrc(Object track) { /* ... */ }
}
```

---

## Testing Strategy

### StringSimilarity Unit Tests

**StringSimilarityTest.java:**

```java
@Test
void testLevenshteinDistance() {
  assertEquals(3, StringSimilarity.levenshteinDistance("kitten", "sitting"));
  assertEquals(0, StringSimilarity.levenshteinDistance("hello", "hello"));
}

@Test
void testCalculateSimilarity() {
  assertTrue(StringSimilarity.calculateSimilarity("hello", "hello") == 1.0);
  assertTrue(StringSimilarity.calculateSimilarity("abc", "xyz") < 0.5);
}

@Test
void testNormalization() {
  assertEquals("ed sheeran feat taylor swift",
      StringSimilarity.normalize("Ed Sheeran (feat. Taylor Swift)"));
  assertEquals("shape of you",
      StringSimilarity.normalize("Shape Of You!!!"));
}

@Test
void testNormalizeEdgeCases() {
  assertEquals("", StringSimilarity.normalize(null));
  assertEquals("", StringSimilarity.normalize(""));
  assertEquals("", StringSimilarity.normalize("   "));
}
```

### MatchingService Unit Tests

**MatchingServiceTest.java:**

Mock SpotifyService and NeteaseService to return controlled test data.

```java
@ExtendWith(MockitoExtension.class)
class MatchingServiceTest {

  @Mock private SpotifyService spotifyService;
  @Mock private NeteaseService neteaseService;

  @InjectMocks private MatchingService matchingService;

  @Test
  void testPerfectMatch() {
    // score = 1.0, status = AUTO_MATCHED
  }

  @Test
  void testHighConfidenceMatch() {
    // score 0.85-1.0, status = AUTO_MATCHED
  }

  @Test
  void testMediumConfidenceMatch() {
    // score 0.60-0.84, status = PENDING_REVIEW
  }

  @Test
  void testLowConfidenceMatch() {
    // score < 0.60, status = FAILED
  }

  @Test
  void testNoSearchResults() {
    // 0 results after all tiers, status = FAILED
  }

  @Test
  void testMissingDuration() {
    // rebalanced weights: name 50%, artist 50%
  }

  @Test
  void testMissingArtist() {
    // rebalanced weights: duration 75%, name 25%
  }

  @Test
  void testSearchFallback() {
    // tier 1 returns 0, tier 2 succeeds
  }

  @Test
  void testDurationScoring() {
    // 0s, 3s, 5s, 10s, 15s differences
  }

  @Test
  void testArtistSimilarity() {
    // multiple artists, best match selection
  }
}
```

**Test Data Examples:**

```java
// Perfect match
SpotifyTrack perfect = new SpotifyTrack();
perfect.setName("Bohemian Rhapsody");
perfect.setArtists(List.of("Queen"));
perfect.setDurationMs(354000);

// Near match (remastered version)
SpotifyTrack near = new SpotifyTrack();
near.setName("Bohemian Rhapsody - Remastered");
near.setArtists(List.of("Queen"));
near.setDurationMs(355000);

// Poor match (cover version)
SpotifyTrack poor = new SpotifyTrack();
poor.setName("Bohemian Rhapsody");
poor.setArtists(List.of("Panic! at the Disco"));
poor.setDurationMs(320000);
```

---

## Performance Considerations

### Per-Track Processing

**Cost breakdown:**
- 1-3 API search calls (avg 1.2 with fallback strategy)
- 1-5 candidate scoring operations (avg 3-4 results per search)
- Levenshtein distance: O(n*m), but track/artist names are short (~10-50 chars)
- **Total time per track: ~200-500ms** (dominated by API latency)

### Playlist Processing Estimates

- 50-track playlist: ~10-25 seconds
- 100-track playlist: ~20-50 seconds
- 500-track playlist: ~2-4 minutes

All processing happens asynchronously in ConversionWorker, so users don't wait synchronously.

### Optimization Opportunities (Future)

- Batch API calls if platform supports it
- Cache search results for duplicate tracks within same job
- Parallel processing of independent tracks
- Pre-compute normalized strings for frequently matched tracks

---

## Logging & Monitoring

### Log Levels

**Info:**
- "Starting match for track: {trackName} by {artist}"
- "Match found with confidence {score}: {destTrack}"
- "No match found after fallback searches"

**Debug:**
- "Search tier {n} returned {count} results"
- "Duration score: {score}, Name score: {score}, Artist score: {score}"
- "Final score: {score}, Status: {status}"

**Error:**
- "Search failed after retries: {error}"
- "Invalid source track data: {details}"

### Metrics to Track (Future)

For tuning thresholds and weights based on real usage:

- Distribution of confidence scores (histogram)
- Auto-match rate (% with score ≥ 0.85)
- Review rate (% with score 0.60-0.84)
- Failure rate (% with score < 0.60)
- Search tier success breakdown (tier 1/2/3 percentages)
- Average processing time per track
- Platform-specific match rates (Spotify→NetEase vs NetEase→Spotify)

---

## Implementation Checklist

- [ ] Create StringSimilarity utility class
- [ ] Implement Levenshtein distance algorithm
- [ ] Implement string normalization methods
- [ ] Write StringSimilarity unit tests
- [ ] Create MatchingService class
- [ ] Implement findBestMatch main method
- [ ] Implement searchWithFallback (3-tier strategy)
- [ ] Implement scoreCandidate with dynamic rebalancing
- [ ] Implement individual scoring methods (duration, name, artist)
- [ ] Implement helper methods for DTO extraction
- [ ] Write MatchingService unit tests
- [ ] Integration with ConversionWorker
- [ ] Manual testing with real playlists
- [ ] Monitor and tune thresholds based on results

---

## Future Enhancements

**Not in initial scope, consider later:**

- Configurable weights and thresholds via application.yml
- Album name as optional tiebreaker
- Machine learning model for scoring (trained on user feedback)
- Caching layer for frequently converted tracks
- Batch API calls for better performance
- User-specific match preferences
- A/B testing different scoring algorithms

---

**End of Design Document**
