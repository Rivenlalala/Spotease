package com.spotease.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveMatchRequest {
    private String destinationTrackId;
    private String destinationTrackName;
    private String destinationArtist;
    private Integer destinationDuration;
    private String destinationAlbumImageUrl;
}
