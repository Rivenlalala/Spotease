package com.spotease.dto.spotify;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SpotifyTrack {
    private String id;
    private String name;
    private List<String> artists;
    private String album;

    @JsonProperty("duration_ms")
    private Integer durationMs;

    private String isrc;
    private String albumImageUrl;
}
