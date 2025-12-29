package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteasePlaylistTracksResponse {
  private Integer status;
  private Body body;

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class Body {
    private Integer code;
    private Integer count;
    private String trackIds;
  }

  public boolean isSuccess() {
    return status != null && status == 200
        && body != null && body.getCode() != null && body.getCode() == 200;
  }
}
