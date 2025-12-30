package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteaseQRKey {
    private Integer code;
    private NeteaseQRKeyData data;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class NeteaseQRKeyData {
        private String unikey;
    }
}
