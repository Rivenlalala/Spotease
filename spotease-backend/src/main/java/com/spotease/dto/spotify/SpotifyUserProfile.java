package com.spotease.dto.spotify;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SpotifyUserProfile {
    private String id;
    private String email;

    @JsonProperty("display_name")
    private String displayName;
}
