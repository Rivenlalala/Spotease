package com.spotease.dto.netease;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NeteaseQRStatus {
    private Integer code;
    private String cookie;
    private String message;

    // Status code meanings:
    // 800 - QR code expired
    // 801 - Waiting for scan
    // 802 - Waiting for confirmation
    // 803 - Login successful
}
