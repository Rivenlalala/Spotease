package com.spotease.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import se.michaelthelin.spotify.SpotifyApi;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spotease.spotify.client-id=test-id",
        "spotease.spotify.client-secret=test-secret",
        "spotease.spotify.redirect-uri=http://localhost:8080/callback",
        "spotease.encryption.key=12345678901234567890123456789012"
})
class SpotifyConfigTest {

    @Autowired
    private SpotifyApi spotifyApi;

    @Test
    void spotifyApiShouldBeConfigured() {
        assertThat(spotifyApi).isNotNull();
        assertThat(spotifyApi.getClientId()).isEqualTo("test-id");
        assertThat(spotifyApi.getClientSecret()).isEqualTo("test-secret");
        assertThat(spotifyApi.getRedirectURI().toString()).isEqualTo("http://localhost:8080/callback");
    }
}
