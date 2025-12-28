package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteasePlaylist {
  private String id;
  private String name;
  private String description;
  private Integer trackCount;
}
