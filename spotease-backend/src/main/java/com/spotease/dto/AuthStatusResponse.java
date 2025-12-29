package com.spotease.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthStatusResponse {
    private boolean authenticated;
    private Long userId;
    private boolean spotifyConnected;
    private boolean neteaseConnected;
}
