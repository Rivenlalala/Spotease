package com.spotease.dto.spotify;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SpotifyPlaylist {
    private String id;
    private String name;
    private String description;
    private Integer totalTracks;

    @JsonProperty("imageUrl")
    private String coverImageUrl;
}
