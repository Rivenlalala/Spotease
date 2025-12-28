package com.spotease.dto.spotify;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SpotifyPlaylist {
    private String id;
    private String name;
    private String description;
    private Integer trackCount;
}
