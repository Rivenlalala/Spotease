package com.spotease.service;

import com.spotease.dto.netease.NeteaseTrack;
import com.spotease.dto.spotify.SpotifyTrack;
import com.spotease.model.ConversionJob;
import com.spotease.model.MatchStatus;
import com.spotease.model.Platform;
import com.spotease.model.TrackMatch;
import com.spotease.util.StringSimilarity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingService {

  private static final double AUTO_MATCH_THRESHOLD = 0.85;
  private static final double REVIEW_THRESHOLD = 0.60;
  private static final double EXISTING_TRACK_THRESHOLD = 0.30;
  private static final int MAX_SEARCH_RESULTS = 5;

  private final SpotifyService spotifyService;
  private final NeteaseService neteaseService;

  /**
   * Check if source track matches any existing tracks in destination playlist.
   * If match score >= 0.30, returns the match without doing an API search.
   *
   * @param sourceTrack the source track (SpotifyTrack or NeteaseTrack)
   * @param existingTracks list of tracks already in the destination playlist
   * @param alreadyMatchedTrackIds set of track IDs that have already been matched to prevent duplicates
   * @param job the conversion job
   * @return TrackMatch if found with score >= 0.30, null otherwise
   */
  public TrackMatch findMatchInExistingTracks(
      Object sourceTrack,
      List<?> existingTracks,
      java.util.Set<String> alreadyMatchedTrackIds,
      ConversionJob job
  ) {
    if (existingTracks == null || existingTracks.isEmpty()) {
      return null;
    }

    String trackName = getTrackName(sourceTrack);
    String sourceTrackId = getTrackId(sourceTrack);

    log.debug("Checking {} existing tracks for match to: {} (excluding {} already matched)",
        existingTracks.size(), trackName, alreadyMatchedTrackIds.size());

    // Score all existing tracks and select best (excluding already matched ones)
    double bestScore = 0.0;
    Object bestCandidate = null;

    for (Object candidate : existingTracks) {
      String candidateId = getTrackId(candidate);

      // Skip tracks that have already been matched
      if (alreadyMatchedTrackIds.contains(candidateId)) {
        continue;
      }

      double score = scoreCandidate(sourceTrack, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    // Only return match if score meets threshold
    if (bestScore >= EXISTING_TRACK_THRESHOLD) {
      MatchStatus status = determineStatus(bestScore);
      log.info("Found existing track match with confidence {}: {}", bestScore, getTrackName(bestCandidate));
      return createTrackMatch(job, sourceTrack, bestCandidate, bestScore, status);
    }

    log.debug("No existing track match found (best score: {})", bestScore);
    return null;
  }

  /**
   * Find the best match for a source track on the destination platform.
   *
   * @param sourceTrack the source track (SpotifyTrack or NeteaseTrack)
   * @param destinationPlatform the target platform
   * @param accessToken the access token for the destination platform
   * @param job the conversion job
   * @return the best track match
   */
  public TrackMatch findBestMatch(
      Object sourceTrack,
      Platform destinationPlatform,
      String accessToken,
      ConversionJob job
  ) {
    String trackName = getTrackName(sourceTrack);
    String artistName = getFirstArtist(sourceTrack);
    String sourceTrackId = getTrackId(sourceTrack);

    log.debug("Finding best match for track: {} by {}", trackName, artistName);

    // Search for the track on the destination platform with fallback
    List<?> searchResults = searchWithFallback(accessToken, sourceTrack, destinationPlatform);

    // If no results found, return failed match
    if (searchResults.isEmpty()) {
      log.debug("No search results found for track: {}", trackName);
      return createFailedMatch(sourceTrackId, job);
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

  /**
   * Search with 3-tier fallback strategy.
   *
   * @param accessToken the access token
   * @param sourceTrack the source track
   * @param platform the platform to search on
   * @return list of search results
   */
  private List<?> searchWithFallback(String accessToken, Object sourceTrack, Platform platform) {
    String trackName = getTrackName(sourceTrack);
    String firstArtist = getFirstArtist(sourceTrack);

    // Tier 1: "{track name}" {first artist}
    String query1 = String.format("\"%s\" %s", trackName, firstArtist);
    List<?> results = executeSearch(accessToken, query1, platform);
    if (!results.isEmpty()) {
      log.debug("Search tier 1 returned {} results", results.size());
      return limitResults(results);
    }

    // Tier 2: {track name} {first artist}
    String query2 = String.format("%s %s", trackName, firstArtist);
    results = executeSearch(accessToken, query2, platform);
    if (!results.isEmpty()) {
      log.debug("Search tier 2 returned {} results", results.size());
      return limitResults(results);
    }

    // Tier 3: {track name}
    results = executeSearch(accessToken, trackName, platform);
    log.debug("Search tier 3 returned {} results", results.size());
    return limitResults(results);
  }

  /**
   * Execute a search on the specified platform.
   *
   * @param accessToken the access token
   * @param query the search query
   * @param platform the platform to search on
   * @return list of search results (never null)
   */
  private List<?> executeSearch(String accessToken, String query, Platform platform) {
    List<?> results;
    if (platform == Platform.NETEASE) {
      results = neteaseService.searchTrack(accessToken, query);
    } else {
      results = spotifyService.searchTrack(accessToken, query);
    }
    return results != null ? results : List.of();
  }

  /**
   * Limit search results to MAX_SEARCH_RESULTS.
   *
   * @param results the full list of results
   * @return limited list of results
   */
  private List<?> limitResults(List<?> results) {
    return results.size() > MAX_SEARCH_RESULTS
        ? results.subList(0, MAX_SEARCH_RESULTS)
        : results;
  }

  /**
   * Create a failed match result.
   *
   * @param sourceTrackId the source track ID
   * @param job the conversion job
   * @return a TrackMatch with FAILED status
   */
  private TrackMatch createFailedMatch(String sourceTrackId, ConversionJob job) {
    TrackMatch match = new TrackMatch();
    match.setSourceTrackId(sourceTrackId);
    match.setConversionJob(job);
    match.setStatus(MatchStatus.FAILED);
    match.setMatchConfidence(0.0);
    match.setDestinationTrackId(null);
    return match;
  }

  // Helper methods to extract data from source tracks

  private String getTrackName(Object track) {
    if (track instanceof SpotifyTrack) {
      return ((SpotifyTrack) track).getName();
    } else if (track instanceof NeteaseTrack) {
      return ((NeteaseTrack) track).getName();
    }
    throw new IllegalArgumentException("Unsupported track type: " + track.getClass().getName());
  }

  private String getFirstArtist(Object track) {
    if (track instanceof SpotifyTrack) {
      List<String> artists = ((SpotifyTrack) track).getArtists();
      return artists.isEmpty() ? "" : artists.get(0);
    } else if (track instanceof NeteaseTrack) {
      List<NeteaseTrack.NeteaseArtist> artists = ((NeteaseTrack) track).getArtists();
      return artists.isEmpty() ? "" : artists.get(0).getName();
    }
    throw new IllegalArgumentException("Unsupported track type: " + track.getClass().getName());
  }

  private String getTrackId(Object track) {
    if (track instanceof SpotifyTrack) {
      return ((SpotifyTrack) track).getId();
    } else if (track instanceof NeteaseTrack) {
      return ((NeteaseTrack) track).getId();
    }
    throw new IllegalArgumentException("Unsupported track type: " + track.getClass().getName());
  }

  private Integer getDurationInSeconds(Object track) {
    if (track instanceof SpotifyTrack) {
      Integer durationMs = ((SpotifyTrack) track).getDurationMs();
      return durationMs != null ? durationMs / 1000 : null;
    } else if (track instanceof NeteaseTrack) {
      Integer durationMs = ((NeteaseTrack) track).getDuration();
      return durationMs != null ? durationMs / 1000 : null;
    }
    throw new IllegalArgumentException("Unsupported track type: " + track.getClass().getName());
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
    // NetEase doesn't provide ISRC
    return null;
  }

  /**
   * Extract image URL from a track.
   *
   * @param track the track (SpotifyTrack or NeteaseTrack)
   * @return the image URL, or null if not available
   */
  private String getImageUrl(Object track) {
    if (track == null) {
      return null;
    }

    if (track instanceof SpotifyTrack) {
      return ((SpotifyTrack) track).getAlbumImageUrl();
    } else if (track instanceof NeteaseTrack) {
      NeteaseTrack neteaseTrack = (NeteaseTrack) track;
      if (neteaseTrack.getAlbum() != null) {
        return neteaseTrack.getAlbum().getPicUrl();
      }
      return null;
    }

    throw new IllegalArgumentException("Unsupported track type: " + track.getClass().getName());
  }

  private double scoreCandidate(Object source, Object candidate) {
    double totalScore = 0.0;
    double totalWeight = 0.0;

    // Track name score (40% weight, always required - most important factor)
    String sourceName = getTrackName(source);
    String candidateName = getTrackName(candidate);
    double nameScore = scoreTrackName(sourceName, candidateName);
    totalScore += nameScore * 0.4;
    totalWeight += 0.4;
    log.debug("Track name score: {}", nameScore);

    // Artist score (30% weight if present)
    List<String> sourceArtists = getArtistNames(source);
    List<String> candidateArtists = getArtistNames(candidate);
    if (!sourceArtists.isEmpty() && !candidateArtists.isEmpty()) {
      double artistScore = scoreArtists(sourceArtists, candidateArtists);
      totalScore += artistScore * 0.3;
      totalWeight += 0.3;
      log.debug("Artist score: {}", artistScore);
    }

    // Duration score (30% weight if present - used to differentiate versions)
    Integer sourceDuration = getDurationMs(source);
    Integer candidateDuration = getDurationMs(candidate);
    if (sourceDuration != null && candidateDuration != null) {
      double durationScore = scoreDuration(sourceDuration, candidateDuration);
      totalScore += durationScore * 0.3;
      totalWeight += 0.3;
      log.debug("Duration score: {}", durationScore);
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

    if (diff <= 1) {
      return 1.0;
    } else if (diff <= 10) {
      return 1.0 - ((diff - 3) / 7.0);
    } else {
      return 0.0;
    }
  }

  private double scoreTrackName(String source, String candidate) {
    return StringSimilarity.calculateSimilarity(source, candidate);
  }

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
    match.setDestinationDuration(getDurationInSeconds(destinationTrack));

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
}
