package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteasePlaylist {
  private String id;
  private String name;
  private String description;
  private Integer totalTracks;
  private String coverImgUrl;
  private Long userId;

  // Normalized getter for naming consistency with SpotifyPlaylist
  public String getCoverImageUrl() {
    return coverImgUrl;
  }
}
