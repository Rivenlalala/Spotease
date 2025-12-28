package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteaseResponse<T> {
  private Integer code;
  private String message;
  private T data;

  // For account endpoint
  private NeteaseAccount account;
  private NeteaseUserProfile profile;

  // For playlist list endpoint
  private List<NeteasePlaylist> playlist;

  // For search endpoint
  private NeteaseSearchResult result;

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class NeteaseAccount {
    private Long id;
    private String userName;
  }

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class NeteasePlaylistWrapper {
    private NeteasePlaylistDetail playlist;
  }

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class NeteasePlaylistDetail extends NeteasePlaylist {
    private List<NeteaseTrack> tracks;
  }

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class NeteaseSearchResult {
    private List<NeteaseTrack> songs;
    private Integer songCount;
  }
}
