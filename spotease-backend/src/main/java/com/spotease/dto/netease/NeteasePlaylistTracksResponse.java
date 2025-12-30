package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteasePlaylistTracksResponse {
    // Normal response format: {"status":200,"body":{"code":200,...}}
    private Integer status;
    private Body body;

    // Error response format: {"code":301,"message":"系统错误",...}
    private Integer code;
    private String message;

    public boolean isSuccess() {
        return status != null && status == 200
                && body != null && body.getCode() != null && body.getCode() == 200;
    }

    /**
     * Check if the response indicates the track is already in the playlist.
     * NetEase returns code 502 with message "歌单内歌曲重复" for duplicates.
     */
    public boolean isDuplicate() {
        return status != null && status == 200
                && body != null && body.getCode() != null && body.getCode() == 502
                && body.getMessage() != null && body.getMessage().contains("重复");
    }

    /**
     * Check if the response indicates session has expired.
     * NetEase returns code 301 at top level when cookie is invalid/expired.
     */
    public boolean isSessionExpired() {
        return code != null && code == 301;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Body {
        private Integer code;
        private Integer count;
        private String trackIds;
        private String message;
    }
}
