package com.spotease.service;

import com.spotease.dto.netease.NeteaseTrack;
import com.spotease.dto.spotify.SpotifyTrack;
import com.spotease.model.ConversionJob;
import com.spotease.model.MatchStatus;
import com.spotease.model.Platform;
import com.spotease.model.TrackMatch;
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

    // Search for the track on the destination platform
    String query = buildQuery(trackName, artistName);
    List<?> searchResults = search(query, accessToken, destinationPlatform);

    // If no results found, return failed match
    if (searchResults.isEmpty()) {
      log.debug("No search results found for: {}", query);
      return createFailedMatch(sourceTrackId, job);
    }

    // TODO: Implement scoring logic in next task
    return createFailedMatch(sourceTrackId, job);
  }

  /**
   * Build a search query string from track name and artist.
   *
   * @param trackName the track name
   * @param artistName the artist name
   * @return the formatted query
   */
  private String buildQuery(String trackName, String artistName) {
    return String.format("\"%s\" %s", trackName, artistName);
  }

  /**
   * Search for tracks on the specified platform.
   *
   * @param query the search query
   * @param accessToken the access token
   * @param platform the platform to search on
   * @return list of search results
   */
  private List<?> search(String query, String accessToken, Platform platform) {
    if (platform == Platform.NETEASE) {
      return neteaseService.searchTrack(query, accessToken);
    } else {
      return spotifyService.searchTrack(query, accessToken);
    }
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
}
