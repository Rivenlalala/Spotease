package com.spotease.controller;

import com.spotease.dto.ApproveMatchRequest;
import com.spotease.dto.TrackMatchDto;
import com.spotease.exception.NeteaseSessionExpiredException;
import com.spotease.model.*;
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
import org.springframework.transaction.annotation.Transactional;
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

        try {
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

            // Get pending and failed matches in a single query
            List<TrackMatch> allMatches = matchRepository.findByConversionJob_IdAndStatusIn(
                    jobId,
                    List.of(MatchStatus.PENDING_REVIEW, MatchStatus.FAILED)
            );

            // Map to DTOs
            List<TrackMatchDto> matchDtos = allMatches.stream()
                    .map(this::mapToDto)
                    .collect(Collectors.toList());

            log.info("Found {} pending/failed matches for job {}", matchDtos.size(), jobId);
            return ResponseEntity.ok(matchDtos);

        } catch (IllegalArgumentException e) {
            log.error("Invalid request for getting pending matches for job {}: {}", jobId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Failed to get pending matches for job {}: {}", jobId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Approve a match and add the track to the destination playlist
     */
    @PostMapping("/{matchId}/approve")
    @Transactional
    public ResponseEntity<Void> approveMatch(
            @PathVariable Long jobId,
            @PathVariable Long matchId,
            @RequestBody(required = false) ApproveMatchRequest request,
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

        // If request body provided, update destination track info
        if (request != null && request.getDestinationTrackId() != null) {
            log.info("Updating destination track for match {} to {}", matchId, request.getDestinationTrackId());
            match.setDestinationTrackId(request.getDestinationTrackId());
            match.setDestinationTrackName(request.getDestinationTrackName());
            match.setDestinationArtist(request.getDestinationArtist());
            match.setDestinationDuration(request.getDestinationDuration());
            // Update confidence to 1.0 since user manually selected
            match.setMatchConfidence(1.0);
        }

        // Verify match has destination track (either original or from request)
        if (match.getDestinationTrackId() == null) {
            log.warn("Match {} has no destination track ID", matchId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        try {
            // Get user from job
            User user = job.getUser();

            // Add track to destination playlist
            addTrackToPlaylist(job, match, user);

            // Update match status
            match.setStatus(MatchStatus.USER_APPROVED);
            match.setReviewedAt(LocalDateTime.now());
            match.setAppliedAt(LocalDateTime.now());
            matchRepository.save(match);

            // Check if all matches are now reviewed
            checkAndUpdateJobStatus(job);

            log.info("Successfully approved match {} and added track to playlist", matchId);
            return ResponseEntity.ok().build();

        } catch (NeteaseSessionExpiredException e) {
            log.warn("NetEase session expired for user {} while approving match {}", userId, matchId);
            // Clear the user's NetEase cookie from database
            User user = job.getUser();
            user.setNeteaseCookie(null);
            user.setNeteaseUserId(null);
            userRepository.save(user);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .header("X-Session-Expired", "netease")
                    .build();
        } catch (IllegalArgumentException e) {
            log.error("Invalid request for approving match {}: {}", matchId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
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

        try {
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

            // Check if all matches are now reviewed
            checkAndUpdateJobStatus(job);

            log.info("Successfully skipped match {}", matchId);
            return ResponseEntity.ok().build();

        } catch (IllegalArgumentException e) {
            log.error("Invalid request for skipping match {}: {}", matchId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Failed to skip match {}: {}", matchId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Manual search for alternative tracks on destination platform
     */
    @GetMapping("/search")
    public ResponseEntity<?> manualSearch(
            @PathVariable Long jobId,
            @RequestParam(required = false) String query,
            HttpSession session) {

        Long userId = getUserIdFromSession(session);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        log.info("Manual search for job {} with query: {}", jobId, query);

        try {
            // Fetch job
            ConversionJob job = jobRepository.findById(jobId).orElse(null);
            if (job == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            // Verify ownership
            if (!job.getUser().getId().equals(userId)) {
                log.warn("User {} attempted to search in job {} owned by user {}",
                        userId, jobId, job.getUser().getId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            // Get user
            User user = job.getUser();

            // Search on destination platform
            Platform destPlatform = job.getDestinationPlatform();

            if (destPlatform == Platform.SPOTIFY) {
                String accessToken = tokenEncryption.decrypt(user.getSpotifyAccessToken());
                List<?> results = spotifyService.searchTrack(accessToken, query);
                return ResponseEntity.ok(results);

            } else if (destPlatform == Platform.NETEASE) {
                String cookie = tokenEncryption.decrypt(user.getNeteaseCookie());
                List<?> results = neteaseService.searchTrack(cookie, query);
                return ResponseEntity.ok(results);

            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }

        } catch (NeteaseSessionExpiredException e) {
            log.warn("NetEase session expired for user {} while searching in job {}", userId, jobId);
            // Clear the user's NetEase cookie from database
            ConversionJob job = jobRepository.findById(jobId).orElse(null);
            if (job != null) {
                User user = job.getUser();
                user.setNeteaseCookie(null);
                user.setNeteaseUserId(null);
                userRepository.save(user);
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .header("X-Session-Expired", "netease")
                    .build();
        } catch (IllegalArgumentException e) {
            log.error("Invalid request for manual search in job {}: {}", jobId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Failed to perform manual search for job {}: {}", jobId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
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
                .destinationDuration(match.getDestinationDuration())
                .matchConfidence(match.getMatchConfidence())
                .status(match.getStatus())
                .errorMessage(match.getErrorMessage())
                .build();
    }

    /**
     * Helper method to check if all matches are reviewed and update job status
     */
    private void checkAndUpdateJobStatus(ConversionJob job) {
        // Count remaining pending/failed matches
        long remainingCount = matchRepository.countByConversionJob_IdAndStatusIn(
                job.getId(),
                List.of(MatchStatus.PENDING_REVIEW, MatchStatus.FAILED)
        );

        if (remainingCount == 0 && job.getStatus() == JobStatus.REVIEW_PENDING) {
            job.setStatus(JobStatus.COMPLETED);
            job.setCompletedAt(LocalDateTime.now());
            jobRepository.save(job);
            log.info("Job {} completed - all matches reviewed", job.getId());
        }
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
