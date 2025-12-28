package com.spotease.service;

import com.spotease.dto.WebSocketMessage;
import com.spotease.model.ConversionJob;
import com.spotease.model.JobStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketService {

  private final SimpMessagingTemplate messagingTemplate;

  public void sendJobUpdate(ConversionJob job) {
    WebSocketMessage message = buildMessage(job);
    String destination = "/topic/conversions/" + job.getId();

    log.debug("Sending WebSocket update to {}: {}", destination, message);
    messagingTemplate.convertAndSend(destination, message);
  }

  public void sendJobComplete(ConversionJob job) {
    WebSocketMessage message = buildMessage(job);
    String destination = "/topic/conversions/" + job.getId();

    log.info("Sending job completion to {}", destination);
    messagingTemplate.convertAndSend(destination, message);
  }

  public void sendJobError(ConversionJob job, String errorMessage) {
    WebSocketMessage message = buildMessage(job);
    message.setStatus(JobStatus.FAILED);
    message.setErrorMessage(errorMessage);

    String destination = "/topic/conversions/" + job.getId();
    log.error("Sending job error to {}: {}", destination, errorMessage);
    messagingTemplate.convertAndSend(destination, message);
  }

  private WebSocketMessage buildMessage(ConversionJob job) {
    return WebSocketMessage.builder()
        .jobId(job.getId())
        .status(job.getStatus())
        .totalTracks(job.getTotalTracks())
        .processedTracks(job.getProcessedTracks())
        .highConfidenceMatches(job.getHighConfidenceMatches())
        .lowConfidenceMatches(job.getLowConfidenceMatches())
        .failedTracks(job.getFailedTracks())
        .build();
  }
}
