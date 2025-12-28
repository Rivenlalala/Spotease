package com.spotease.controller;

import com.spotease.dto.ConversionRequest;
import com.spotease.dto.ConversionResponse;
import com.spotease.model.ConversionJob;
import com.spotease.repository.ConversionJobRepository;
import com.spotease.service.ConversionService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/conversions")
@RequiredArgsConstructor
@Slf4j
public class ConversionController {

  private final ConversionService conversionService;
  private final ConversionJobRepository jobRepository;

  /**
   * Create a new conversion job
   */
  @PostMapping
  public ResponseEntity<ConversionResponse> createConversionJob(
      @Valid @RequestBody ConversionRequest request,
      HttpSession session) {

    Long userId = getUserIdFromSession(session);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    log.info("Creating conversion job for user {}", userId);

    ConversionJob job = conversionService.createJob(userId, request);
    ConversionResponse response = mapToResponse(job);

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  /**
   * Get all conversion jobs for the authenticated user
   */
  @GetMapping
  public ResponseEntity<List<ConversionResponse>> getAllConversionJobs(HttpSession session) {
    Long userId = getUserIdFromSession(session);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    log.info("Fetching all conversion jobs for user {}", userId);

    List<ConversionJob> jobs = jobRepository.findByUser_Id(userId);
    List<ConversionResponse> responses = jobs.stream()
        .map(this::mapToResponse)
        .collect(Collectors.toList());

    return ResponseEntity.ok(responses);
  }

  /**
   * Get a specific conversion job by ID
   */
  @GetMapping("/{jobId}")
  public ResponseEntity<ConversionResponse> getConversionJob(
      @PathVariable Long jobId,
      HttpSession session) {

    Long userId = getUserIdFromSession(session);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    log.info("Fetching conversion job {} for user {}", jobId, userId);

    ConversionJob job = jobRepository.findById(jobId)
        .orElse(null);

    if (job == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    // Check ownership
    if (!job.getUser().getId().equals(userId)) {
      log.warn("User {} attempted to access job {} owned by user {}",
          userId, jobId, job.getUser().getId());
      return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    ConversionResponse response = mapToResponse(job);
    return ResponseEntity.ok(response);
  }

  /**
   * Delete a conversion job by ID
   */
  @DeleteMapping("/{jobId}")
  public ResponseEntity<Void> deleteConversionJob(
      @PathVariable Long jobId,
      HttpSession session) {

    Long userId = getUserIdFromSession(session);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    log.info("Deleting conversion job {} for user {}", jobId, userId);

    ConversionJob job = jobRepository.findById(jobId)
        .orElse(null);

    if (job == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    // Check ownership
    if (!job.getUser().getId().equals(userId)) {
      log.warn("User {} attempted to delete job {} owned by user {}",
          userId, jobId, job.getUser().getId());
      return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    jobRepository.delete(job);
    log.info("Deleted conversion job {}", jobId);

    return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
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
   * Helper method to map ConversionJob to ConversionResponse
   */
  private ConversionResponse mapToResponse(ConversionJob job) {
    return ConversionResponse.builder()
        .jobId(job.getId())
        .status(job.getStatus())
        .sourcePlaylistName(job.getSourcePlaylistName())
        .destinationPlaylistName(job.getDestinationPlaylistName())
        .totalTracks(job.getTotalTracks())
        .processedTracks(job.getProcessedTracks())
        .highConfidenceMatches(job.getHighConfidenceMatches())
        .lowConfidenceMatches(job.getLowConfidenceMatches())
        .failedTracks(job.getFailedTracks())
        .createdAt(job.getCreatedAt())
        .completedAt(job.getCompletedAt())
        .build();
  }
}
