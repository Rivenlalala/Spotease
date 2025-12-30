package com.spotease.service;

import com.spotease.dto.WebSocketMessage;
import com.spotease.model.ConversionJob;
import com.spotease.model.JobStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class WebSocketServiceTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private WebSocketService webSocketService;

    private ConversionJob job;

    @BeforeEach
    void setUp() {
        job = new ConversionJob();
        job.setId(1L);
        job.setStatus(JobStatus.PROCESSING);
        job.setTotalTracks(10);
        job.setProcessedTracks(5);
        job.setHighConfidenceMatches(3);
        job.setLowConfidenceMatches(1);
        job.setFailedTracks(1);
    }

    @Test
    void shouldSendJobUpdateToBothTopics() {
        // When
        webSocketService.sendJobUpdate(job);

        // Then - verify message sent to both general and job-specific topics
        verify(messagingTemplate, times(2)).convertAndSend(any(String.class), any(WebSocketMessage.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/conversions"), any(WebSocketMessage.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/conversions/1"), any(WebSocketMessage.class));
    }

    @Test
    void shouldSendJobUpdateWithCorrectMessage() {
        // When
        webSocketService.sendJobUpdate(job);

        // Then
        ArgumentCaptor<WebSocketMessage> messageCaptor = ArgumentCaptor.forClass(WebSocketMessage.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/conversions"), messageCaptor.capture());

        WebSocketMessage message = messageCaptor.getValue();
        assertThat(message.getJobId()).isEqualTo(1L);
        assertThat(message.getStatus()).isEqualTo(JobStatus.PROCESSING);
        assertThat(message.getTotalTracks()).isEqualTo(10);
        assertThat(message.getProcessedTracks()).isEqualTo(5);
        assertThat(message.getHighConfidenceMatches()).isEqualTo(3);
        assertThat(message.getLowConfidenceMatches()).isEqualTo(1);
        assertThat(message.getFailedTracks()).isEqualTo(1);
    }

    @Test
    void shouldSendJobCompleteToBothTopics() {
        // When
        webSocketService.sendJobComplete(job);

        // Then
        verify(messagingTemplate, times(2)).convertAndSend(any(String.class), any(WebSocketMessage.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/conversions"), any(WebSocketMessage.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/conversions/1"), any(WebSocketMessage.class));
    }

    @Test
    void shouldSendJobCompleteWithCorrectMessage() {
        // When
        webSocketService.sendJobComplete(job);

        // Then
        ArgumentCaptor<WebSocketMessage> messageCaptor = ArgumentCaptor.forClass(WebSocketMessage.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/conversions"), messageCaptor.capture());

        WebSocketMessage message = messageCaptor.getValue();
        assertThat(message.getJobId()).isEqualTo(1L);
        assertThat(message.getStatus()).isEqualTo(JobStatus.PROCESSING);
    }

    @Test
    void shouldSendJobErrorToBothTopics() {
        // When
        webSocketService.sendJobError(job, "Test error message");

        // Then
        verify(messagingTemplate, times(2)).convertAndSend(any(String.class), any(WebSocketMessage.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/conversions"), any(WebSocketMessage.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/conversions/1"), any(WebSocketMessage.class));
    }

    @Test
    void shouldSendJobErrorWithCorrectMessage() {
        // When
        webSocketService.sendJobError(job, "Test error message");

        // Then
        ArgumentCaptor<WebSocketMessage> messageCaptor = ArgumentCaptor.forClass(WebSocketMessage.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/conversions"), messageCaptor.capture());

        WebSocketMessage message = messageCaptor.getValue();
        assertThat(message.getJobId()).isEqualTo(1L);
        assertThat(message.getStatus()).isEqualTo(JobStatus.FAILED);
        assertThat(message.getErrorMessage()).isEqualTo("Test error message");
    }
}
