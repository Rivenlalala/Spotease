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

    @JsonProperty("ar")
    private List<NeteaseArtist> artists;

    @JsonProperty("al")
    private NeteaseAlbum album;

    @JsonProperty("dt")
    private Integer duration;  // in milliseconds

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class NeteaseArtist {
        private String id;
        private String name;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class NeteaseAlbum {
        private String id;
        private String name;
        private String picUrl;
    }
}
