package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteaseTrack {
  private String id;
  private String name;
  private List<String> artists;
  private String album;

  @JsonProperty("duration")
  private Integer duration;
}
