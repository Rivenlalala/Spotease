package com.spotease.controller;

import com.spotease.dto.TrackMatchDto;
import com.spotease.model.ConversionJob;
import com.spotease.model.MatchStatus;
import com.spotease.model.Platform;
import com.spotease.model.TrackMatch;
import com.spotease.model.User;
import com.spotease.repository.ConversionJobRepository;
import com.spotease.repository.TrackMatchRepository;
import com.spotease.repository.UserRepository;
import com.spotease.service.NeteaseService;
import com.spotease.service.SpotifyService;
import com.spotease.util.TokenEncryption;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/conversions/{jobId}/matches")
@RequiredArgsConstructor
@Slf4j
public class ReviewController {

  private final ConversionJobRepository jobRepository;
  private final TrackMatchRepository matchRepository;
  private final UserRepository userRepository;
  private final SpotifyService spotifyService;
  private final NeteaseService neteaseService;
  private final TokenEncryption tokenEncryption;

  /**
   * Get all pending or failed matches for a conversion job
   */
  @GetMapping("/pending")
  public ResponseEntity<List<TrackMatchDto>> getPendingMatches(
      @PathVariable Long jobId,
      HttpSession session) {

    Long userId = getUserIdFromSession(session);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    log.info("Fetching pending matches for job {} by user {}", jobId, userId);

    // Fetch job
    ConversionJob job = jobRepository.findById(jobId).orElse(null);
    if (job == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    // Verify ownership
    if (!job.getUser().getId().equals(userId)) {
      log.warn("User {} attempted to access job {} owned by user {}",
          userId, jobId, job.getUser().getId());
      return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    // Get pending and failed matches
    List<TrackMatch> pendingMatches = matchRepository.findByConversionJob_IdAndStatus(jobId, MatchStatus.PENDING_REVIEW);
    List<TrackMatch> failedMatches = matchRepository.findByConversionJob_IdAndStatus(jobId, MatchStatus.FAILED);

    // Combine and map to DTOs
    List<TrackMatchDto> allMatches = pendingMatches.stream()
        .map(this::mapToDto)
        .collect(Collectors.toList());

    allMatches.addAll(failedMatches.stream()
        .map(this::mapToDto)
        .collect(Collectors.toList()));

    log.info("Found {} pending/failed matches for job {}", allMatches.size(), jobId);
    return ResponseEntity.ok(allMatches);
  }

  /**
   * Approve a match and add the track to the destination playlist
   */
  @PostMapping("/{matchId}/approve")
  public ResponseEntity<Void> approveMatch(
      @PathVariable Long jobId,
      @PathVariable Long matchId,
      HttpSession session) {

    Long userId = getUserIdFromSession(session);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    log.info("Approving match {} for job {} by user {}", matchId, jobId, userId);

    // Fetch job
    ConversionJob job = jobRepository.findById(jobId).orElse(null);
    if (job == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    // Verify ownership
    if (!job.getUser().getId().equals(userId)) {
      log.warn("User {} attempted to approve match in job {} owned by user {}",
          userId, jobId, job.getUser().getId());
      return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    // Fetch match
    TrackMatch match = matchRepository.findById(matchId).orElse(null);
    if (match == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    // Verify match belongs to job
    if (!match.getConversionJob().getId().equals(jobId)) {
      log.warn("Match {} does not belong to job {}", matchId, jobId);
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }

    // Verify match has destination track
    if (match.getDestinationTrackId() == null) {
      log.warn("Match {} has no destination track ID", matchId);
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }

    try {
      // Get user
      User user = userRepository.findById(userId).orElse(null);
      if (user == null) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
      }

      // Add track to destination playlist
      addTrackToPlaylist(job, match, user);

      // Update match status
      match.setStatus(MatchStatus.USER_APPROVED);
      match.setReviewedAt(LocalDateTime.now());
      match.setAppliedAt(LocalDateTime.now());
      matchRepository.save(match);

      log.info("Successfully approved match {} and added track to playlist", matchId);
      return ResponseEntity.ok().build();

    } catch (Exception e) {
      log.error("Failed to approve match {}: {}", matchId, e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Skip a match (mark as user-skipped)
   */
  @PostMapping("/{matchId}/skip")
  public ResponseEntity<Void> skipMatch(
      @PathVariable Long jobId,
      @PathVariable Long matchId,
      HttpSession session) {

    Long userId = getUserIdFromSession(session);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    log.info("Skipping match {} for job {} by user {}", matchId, jobId, userId);

    // Fetch job
    ConversionJob job = jobRepository.findById(jobId).orElse(null);
    if (job == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    // Verify ownership
    if (!job.getUser().getId().equals(userId)) {
      log.warn("User {} attempted to skip match in job {} owned by user {}",
          userId, jobId, job.getUser().getId());
      return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    // Fetch match
    TrackMatch match = matchRepository.findById(matchId).orElse(null);
    if (match == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    // Verify match belongs to job
    if (!match.getConversionJob().getId().equals(jobId)) {
      log.warn("Match {} does not belong to job {}", matchId, jobId);
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }

    // Update match status
    match.setStatus(MatchStatus.USER_SKIPPED);
    match.setReviewedAt(LocalDateTime.now());
    matchRepository.save(match);

    log.info("Successfully skipped match {}", matchId);
    return ResponseEntity.ok().build();
  }

  /**
   * Helper method to get userId from HttpSession
   */
  private Long getUserIdFromSession(HttpSession session) {
    if (session == null) {
      return null;
    }
    Object userIdObj = session.getAttribute("userId");
    if (userIdObj instanceof Long) {
      return (Long) userIdObj;
    }
    return null;
  }

  /**
   * Helper method to map TrackMatch to TrackMatchDto
   */
  private TrackMatchDto mapToDto(TrackMatch match) {
    return TrackMatchDto.builder()
        .matchId(match.getId())
        .sourceTrackId(match.getSourceTrackId())
        .sourceTrackName(match.getSourceTrackName())
        .sourceArtist(match.getSourceArtist())
        .sourceAlbum(match.getSourceAlbum())
        .sourceDuration(match.getSourceDuration())
        .destinationTrackId(match.getDestinationTrackId())
        .destinationTrackName(match.getDestinationTrackName())
        .destinationArtist(match.getDestinationArtist())
        .matchConfidence(match.getMatchConfidence())
        .status(match.getStatus())
        .errorMessage(match.getErrorMessage())
        .build();
  }

  /**
   * Helper method to add track to destination playlist
   */
  private void addTrackToPlaylist(ConversionJob job, TrackMatch match, User user) {
    Platform destPlatform = job.getDestinationPlatform();
    String playlistId = job.getDestinationPlaylistId();
    String trackId = match.getDestinationTrackId();

    if (destPlatform == Platform.SPOTIFY) {
      // Decrypt Spotify access token
      String accessToken = tokenEncryption.decrypt(user.getSpotifyAccessToken());

      // Format as Spotify URI
      String trackUri = "spotify:track:" + trackId;

      // Add to playlist
      spotifyService.addTracksToPlaylist(accessToken, playlistId, List.of(trackUri));
      log.info("Added Spotify track {} to playlist {}", trackId, playlistId);

    } else if (destPlatform == Platform.NETEASE) {
      // Decrypt NetEase cookie
      String cookie = tokenEncryption.decrypt(user.getNeteaseCookie());

      // Add to playlist
      neteaseService.addTracksToPlaylist(cookie, playlistId, List.of(trackId));
      log.info("Added NetEase track {} to playlist {}", trackId, playlistId);

    } else {
      throw new IllegalArgumentException("Unsupported platform: " + destPlatform);
    }
  }
}
