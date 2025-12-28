package com.spotease.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import se.michaelthelin.spotify.SpotifyApi;

import java.net.URI;

@Configuration
public class SpotifyConfig {

  @Value("${spotease.spotify.client-id}")
  private String clientId;

  @Value("${spotease.spotify.client-secret}")
  private String clientSecret;

  @Value("${spotease.spotify.redirect-uri}")
  private String redirectUri;

  @Bean
  public SpotifyApi spotifyApi() {
    return new SpotifyApi.Builder()
        .setClientId(clientId)
        .setClientSecret(clientSecret)
        .setRedirectUri(URI.create(redirectUri))
        .build();
  }
}
