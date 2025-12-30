package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteasePlaylistDetailResponse {
    private Integer code;
    private String message;
    private NeteasePlaylistDetail playlist;

    @Data
    @EqualsAndHashCode(callSuper = true)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class NeteasePlaylistDetail extends NeteasePlaylist {
        private List<NeteaseTrack> tracks;
    }
}
