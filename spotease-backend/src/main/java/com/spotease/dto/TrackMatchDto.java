package com.spotease.dto;

import com.spotease.model.MatchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackMatchDto {
  private Long matchId;
  private String sourceTrackId;
  private String sourceTrackName;
  private String sourceArtist;
  private String sourceAlbum;
  private Integer sourceDuration;
  private String destinationTrackId;
  private String destinationTrackName;
  private String destinationArtist;
  private Integer destinationDuration;
  private Double matchConfidence;
  private MatchStatus status;
  private String errorMessage;
}
