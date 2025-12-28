package com.spotease.dto;

import com.spotease.model.JobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketMessage {
  private Long jobId;
  private JobStatus status;
  private Integer totalTracks;
  private Integer processedTracks;
  private Integer highConfidenceMatches;
  private Integer lowConfidenceMatches;
  private Integer failedTracks;
  private String errorMessage;
}
