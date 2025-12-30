package com.spotease.worker;

import com.spotease.model.*;
import com.spotease.repository.ConversionJobRepository;
import com.spotease.repository.TrackMatchRepository;
import com.spotease.service.MatchingService;
import com.spotease.service.NeteaseService;
import com.spotease.service.SpotifyService;
import com.spotease.service.WebSocketService;
import com.spotease.util.TokenEncryption;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class ConversionWorker {

    private final ConversionJobRepository jobRepository;
    private final TrackMatchRepository trackMatchRepository;
    private final SpotifyService spotifyService;
    private final NeteaseService neteaseService;
    private final MatchingService matchingService;
    private final WebSocketService webSocketService;
    private final TokenEncryption tokenEncryption;

    @Async("taskExecutor")
    @Transactional
    public void processConversionJob(Long jobId) {
        log.info("Starting processing of conversion job {}", jobId);

        ConversionJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

        try {
            // Update status to PROCESSING
            job.setStatus(JobStatus.PROCESSING);
            jobRepository.save(job);
            webSocketService.sendJobUpdate(job);

            // Decrypt tokens
            String sourceToken = getSourceToken(job);
            String destToken = getDestinationToken(job);

            // Create destination playlist if CREATE mode
            if (job.getMode() == ConversionMode.CREATE) {
                String playlistId = createDestinationPlaylist(job, destToken);
                job.setDestinationPlaylistId(playlistId);
                jobRepository.save(job);
            }

            // Get source tracks
            List<?> sourceTracks = getSourceTracks(job, sourceToken);
            log.info("Found {} tracks in source playlist", sourceTracks.size());

            // For UPDATE mode, get existing tracks from destination
            List<?> existingTracks = null;
            Set<String> alreadyMatchedTrackIds = new HashSet<>();
            if (job.getMode() == ConversionMode.UPDATE) {
                existingTracks = getDestinationTracks(job, destToken);
                if (existingTracks != null) {
                    log.info("Found {} existing tracks in destination playlist", existingTracks.size());
                }
            }

            // Process each track
            List<String> autoMatchedTrackIds = new ArrayList<>();

            for (int i = 0; i < sourceTracks.size(); i++) {
                Object sourceTrack = sourceTracks.get(i);
                TrackMatch match;

                // First check if track already exists in destination (UPDATE mode only)
                if (job.getMode() == ConversionMode.UPDATE && existingTracks != null) {
                    match = matchingService.findMatchInExistingTracks(
                            sourceTrack, existingTracks, alreadyMatchedTrackIds, job);

                    if (match != null) {
                        log.debug("Track already exists in destination playlist (score: {}), skipping API search",
                                match.getMatchConfidence());
                        // Save match and continue - don't add to autoMatchedTrackIds since it already exists
                        trackMatchRepository.save(match);

                        // Track this destination track as matched to prevent duplicate matches
                        alreadyMatchedTrackIds.add(match.getDestinationTrackId());

                        // Update counters based on match status
                        job.setProcessedTracks(i + 1);
                        if (match.getStatus() == MatchStatus.AUTO_MATCHED) {
                            job.setHighConfidenceMatches(job.getHighConfidenceMatches() + 1);
                        } else if (match.getStatus() == MatchStatus.PENDING_REVIEW) {
                            job.setLowConfidenceMatches(job.getLowConfidenceMatches() + 1);
                        } else {
                            job.setFailedTracks(job.getFailedTracks() + 1);
                        }

                        // Save progress and send update every 5 tracks or on last track
                        if (i % 5 == 0 || i == sourceTracks.size() - 1) {
                            jobRepository.save(job);
                            webSocketService.sendJobUpdate(job);
                        }
                        continue; // Skip to next track
                    }
                }

                // No existing match found, search for best match via API
                match = matchingService.findBestMatch(
                        sourceTrack,
                        job.getDestinationPlatform(),
                        destToken,
                        job
                );

                // Save match
                trackMatchRepository.save(match);

                // Update counters
                job.setProcessedTracks(i + 1);

                if (match.getStatus() == MatchStatus.AUTO_MATCHED) {
                    job.setHighConfidenceMatches(job.getHighConfidenceMatches() + 1);
                    autoMatchedTrackIds.add(match.getDestinationTrackId());
                } else if (match.getStatus() == MatchStatus.PENDING_REVIEW) {
                    job.setLowConfidenceMatches(job.getLowConfidenceMatches() + 1);
                } else {
                    job.setFailedTracks(job.getFailedTracks() + 1);
                }

                // Save progress and send update every 5 tracks or on last track
                if (i % 5 == 0 || i == sourceTracks.size() - 1) {
                    jobRepository.save(job);
                    webSocketService.sendJobUpdate(job);
                }
            }

            // Add auto-matched tracks to destination playlist
            if (!autoMatchedTrackIds.isEmpty()) {
                addTracksToDestination(job, destToken, autoMatchedTrackIds);
            }

            // Determine final status
            if (job.getLowConfidenceMatches() > 0 || job.getFailedTracks() > 0) {
                job.setStatus(JobStatus.REVIEW_PENDING);
            } else {
                job.setStatus(JobStatus.COMPLETED);
                job.setCompletedAt(LocalDateTime.now());
            }

            jobRepository.save(job);
            webSocketService.sendJobComplete(job);

            log.info("Completed job {}: {} auto-matched, {} pending review, {} failed",
                    jobId, job.getHighConfidenceMatches(), job.getLowConfidenceMatches(), job.getFailedTracks());

        } catch (Exception e) {
            log.error("Error processing job {}: {}", jobId, e.getMessage(), e);

            // Reload job to ensure we have latest state
            ConversionJob failedJob = jobRepository.findById(jobId)
                    .orElse(job);

            failedJob.setStatus(JobStatus.FAILED);
            jobRepository.save(failedJob);
            webSocketService.sendJobError(failedJob, e.getMessage());

            // Don't rethrow - we've handled the error
        }
    }

    private String getSourceToken(ConversionJob job) {
        if (job.getSourcePlatform() == Platform.SPOTIFY) {
            return tokenEncryption.decrypt(job.getUser().getSpotifyAccessToken());
        } else {
            return tokenEncryption.decrypt(job.getUser().getNeteaseCookie());
        }
    }

    private String getDestinationToken(ConversionJob job) {
        if (job.getDestinationPlatform() == Platform.SPOTIFY) {
            return tokenEncryption.decrypt(job.getUser().getSpotifyAccessToken());
        } else {
            return tokenEncryption.decrypt(job.getUser().getNeteaseCookie());
        }
    }

    private List<?> getSourceTracks(ConversionJob job, String token) {
        if (job.getSourcePlatform() == Platform.SPOTIFY) {
            return spotifyService.getPlaylistTracks(token, job.getSourcePlaylistId());
        } else {
            return neteaseService.getPlaylistTracks(token, job.getSourcePlaylistId());
        }
    }

    private String createDestinationPlaylist(ConversionJob job, String token) {
        log.info("Creating destination playlist: {}", job.getDestinationPlaylistName());

        if (job.getDestinationPlatform() == Platform.SPOTIFY) {
            return spotifyService.createPlaylist(token, job.getDestinationPlaylistName());
        } else {
            return neteaseService.createPlaylist(token, job.getDestinationPlaylistName());
        }
    }

    private void addTracksToDestination(ConversionJob job, String token, List<String> trackIds) {
        log.info("Adding {} tracks to destination playlist", trackIds.size());

        if (job.getDestinationPlatform() == Platform.SPOTIFY) {
            // Spotify expects URIs in format: spotify:track:id
            List<String> uris = trackIds.stream()
                    .map(id -> "spotify:track:" + id)
                    .toList();
            spotifyService.addTracksToPlaylist(token, job.getDestinationPlaylistId(), uris);
        } else {
            neteaseService.addTracksToPlaylist(token, job.getDestinationPlaylistId(), trackIds);
        }
    }

    /**
     * Fetches all tracks from the destination playlist.
     * Used in UPDATE mode to avoid adding duplicate tracks.
     *
     * @param job   The conversion job containing destination platform details
     * @param token The decrypted authentication token for the destination platform
     * @return List of tracks from the destination playlist, or empty list if none exist
     */
    private List<?> getDestinationTracks(ConversionJob job, String token) {
        if (job.getDestinationPlatform() == Platform.SPOTIFY) {
            return spotifyService.getPlaylistTracks(token, job.getDestinationPlaylistId());
        } else {
            return neteaseService.getPlaylistTracks(token, job.getDestinationPlaylistId());
        }
    }

}
