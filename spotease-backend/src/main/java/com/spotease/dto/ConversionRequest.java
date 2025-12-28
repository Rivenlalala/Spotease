package com.spotease.dto;

import com.spotease.model.ConversionMode;
import com.spotease.model.Platform;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionRequest {

  @NotNull(message = "Source platform is required")
  private Platform sourcePlatform;

  @NotNull(message = "Source playlist ID is required")
  private String sourcePlaylistId;

  @NotNull(message = "Conversion mode is required")
  private ConversionMode mode;

  // For CREATE mode: name of new playlist
  private String destinationPlaylistName;

  // For UPDATE mode: ID of existing playlist
  private String destinationPlaylistId;
}
