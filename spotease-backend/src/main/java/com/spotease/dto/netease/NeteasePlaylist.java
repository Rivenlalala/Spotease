package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteasePlaylist {
  private String id;
  private String name;
  private String description;
  private Integer totalTracks;
  @JsonIgnore
  private String coverImgUrl;
  private Long userId;

  // Serialize as imageUrl for frontend consistency
  @JsonProperty("imageUrl")
  public String getImageUrl() {
    return coverImgUrl;
  }
}
