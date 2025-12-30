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
        sendToTopics(job.getId(), message);
        log.debug("Sending WebSocket update for job {}: {}", job.getId(), message);
    }

    public void sendJobComplete(ConversionJob job) {
        WebSocketMessage message = buildMessage(job);
        sendToTopics(job.getId(), message);
        log.info("Sending job completion for job {}", job.getId());
    }

    public void sendJobError(ConversionJob job, String errorMessage) {
        WebSocketMessage message = buildMessage(job);
        message.setStatus(JobStatus.FAILED);
        message.setErrorMessage(errorMessage);
        sendToTopics(job.getId(), message);
        log.error("Sending job error for job {}: {}", job.getId(), errorMessage);
    }

    private void sendToTopics(Long jobId, WebSocketMessage message) {
        // Send to general topic for Dashboard (all jobs)
        messagingTemplate.convertAndSend("/topic/conversions", message);
        // Send to job-specific topic for detail views
        messagingTemplate.convertAndSend("/topic/conversions/" + jobId, message);
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
