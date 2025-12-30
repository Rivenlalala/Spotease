package com.spotease.dto;

import com.spotease.model.JobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionResponse {
    private Long id;
    private JobStatus status;
    private String sourcePlatform;
    private String sourcePlaylistId;
    private String sourcePlaylistName;
    private String destinationPlatform;
    private String destinationPlaylistId;
    private String destinationPlaylistName;
    private String mode;
    private Integer totalTracks;
    private Integer processedTracks;
    private Integer highConfidenceMatches;
    private Integer lowConfidenceMatches;
    private Integer failedTracks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
}
