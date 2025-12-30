package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteaseUserProfile {
    private Long userId;
    private String nickname;
    private String avatarUrl;
    private String signature;
}
