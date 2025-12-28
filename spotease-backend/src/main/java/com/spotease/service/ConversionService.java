package com.spotease.service;

import com.spotease.dto.ConversionRequest;
import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.model.*;
import com.spotease.repository.ConversionJobRepository;
import com.spotease.repository.UserRepository;
import com.spotease.util.TokenEncryption;
import com.spotease.worker.ConversionWorker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversionService {

  private final ConversionJobRepository jobRepository;
  private final UserRepository userRepository;
  private final SpotifyService spotifyService;
  private final NeteaseService neteaseService;
  private final TokenEncryption tokenEncryption;
  private final ConversionWorker conversionWorker;

  @Transactional
  public ConversionJob createJob(Long userId, ConversionRequest request) {
    log.info("Creating conversion job for user {}", userId);

    // Validate request
    validateRequest(request);

    // Load user
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found: " + userId));

    // Determine destination platform (opposite of source)
    Platform destinationPlatform = request.getSourcePlatform() == Platform.SPOTIFY
        ? Platform.NETEASE
        : Platform.SPOTIFY;

    // Get source playlist info
    String sourcePlaylistName;
    int totalTracks;

    if (request.getSourcePlatform() == Platform.SPOTIFY) {
      String accessToken = tokenEncryption.decrypt(user.getSpotifyAccessToken());
      SpotifyPlaylist playlist = spotifyService.getPlaylistById(accessToken, request.getSourcePlaylistId());
      sourcePlaylistName = playlist.getName();
      totalTracks = playlist.getTrackCount();
    } else {
      String cookie = tokenEncryption.decrypt(user.getNeteaseCookie());
      NeteasePlaylist playlist = neteaseService.getPlaylistById(cookie, request.getSourcePlaylistId());
      sourcePlaylistName = playlist.getName();
      totalTracks = playlist.getTrackCount();
    }

    // Create job
    ConversionJob job = new ConversionJob();
    job.setUser(user);
    job.setSourcePlatform(request.getSourcePlatform());
    job.setSourcePlaylistId(request.getSourcePlaylistId());
    job.setSourcePlaylistName(sourcePlaylistName);
    job.setDestinationPlatform(destinationPlatform);
    job.setMode(request.getMode());
    job.setStatus(JobStatus.QUEUED);
    job.setTotalTracks(totalTracks);
    job.setProcessedTracks(0);
    job.setHighConfidenceMatches(0);
    job.setLowConfidenceMatches(0);
    job.setFailedTracks(0);

    if (request.getMode() == ConversionMode.CREATE) {
      job.setDestinationPlaylistName(request.getDestinationPlaylistName());
    } else {
      job.setDestinationPlaylistId(request.getDestinationPlaylistId());
      // Get destination playlist name for display
      if (destinationPlatform == Platform.SPOTIFY) {
        String accessToken = tokenEncryption.decrypt(user.getSpotifyAccessToken());
        SpotifyPlaylist playlist = spotifyService.getPlaylistById(accessToken, request.getDestinationPlaylistId());
        job.setDestinationPlaylistName(playlist.getName());
      } else {
        String cookie = tokenEncryption.decrypt(user.getNeteaseCookie());
        NeteasePlaylist playlist = neteaseService.getPlaylistById(cookie, request.getDestinationPlaylistId());
        job.setDestinationPlaylistName(playlist.getName());
      }
    }

    ConversionJob savedJob = jobRepository.save(job);
    log.info("Created conversion job {}: {} → {}", savedJob.getId(), sourcePlaylistName, job.getDestinationPlaylistName());

    // Trigger async worker
    conversionWorker.processConversionJob(savedJob.getId());

    return savedJob;
  }

  private void validateRequest(ConversionRequest request) {
    if (request.getMode() == ConversionMode.CREATE) {
      if (request.getDestinationPlaylistName() == null || request.getDestinationPlaylistName().isBlank()) {
        throw new IllegalArgumentException("For CREATE mode, destination playlist name is required");
      }
    } else {
      if (request.getDestinationPlaylistId() == null || request.getDestinationPlaylistId().isBlank()) {
        throw new IllegalArgumentException("For UPDATE mode, destination playlist ID is required");
      }
    }
  }
}
