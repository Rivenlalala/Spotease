package com.spotease.dto.netease;

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
  private Long userId;

  // Read from API as coverImgUrl, serialize as imageUrl
  @JsonProperty(value = "coverImgUrl", access = JsonProperty.Access.WRITE_ONLY)
  private String coverImgUrl;

  @JsonProperty("imageUrl")
  public String getImageUrl() {
    return coverImgUrl;
  }
}
