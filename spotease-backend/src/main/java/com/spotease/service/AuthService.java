package com.spotease.service;

import com.spotease.dto.spotify.SpotifyTokenResponse;
import com.spotease.dto.spotify.SpotifyUserProfile;
import com.spotease.model.User;
import com.spotease.repository.UserRepository;
import com.spotease.util.TokenEncryption;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

  private final UserRepository userRepository;
  private final TokenEncryption tokenEncryption;
  private final WebClient.Builder webClientBuilder;

  @Value("${spotease.spotify.client-id}")
  private String spotifyClientId;

  @Value("${spotease.spotify.client-secret}")
  private String spotifyClientSecret;

  @Value("${spotease.spotify.redirect-uri}")
  private String spotifyRedirectUri;

  public String getSpotifyAuthUrl(String state) {
    String scope = "user-read-email playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private";
    return UriComponentsBuilder.fromHttpUrl("https://accounts.spotify.com/authorize")
        .queryParam("client_id", spotifyClientId)
        .queryParam("response_type", "code")
        .queryParam("redirect_uri", spotifyRedirectUri)
        .queryParam("scope", scope)
        .queryParam("state", state)
        .toUriString();
  }

  public User handleSpotifyCallback(String code) {
    // Exchange code for tokens
    SpotifyTokenResponse tokenResponse = exchangeCodeForToken(code);

    // Get user profile
    SpotifyUserProfile profile = getSpotifyUserProfile(tokenResponse.getAccessToken());

    // Create or update user
    User user = userRepository.findBySpotifyUserId(profile.getId())
        .orElse(new User());

    user.setSpotifyUserId(profile.getId());
    user.setEmail(profile.getEmail());
    user.setSpotifyAccessToken(tokenEncryption.encrypt(tokenResponse.getAccessToken()));
    user.setSpotifyRefreshToken(tokenEncryption.encrypt(tokenResponse.getRefreshToken()));
    user.setSpotifyTokenExpiry(LocalDateTime.now().plusSeconds(tokenResponse.getExpiresIn()));

    return userRepository.save(user);
  }

  private SpotifyTokenResponse exchangeCodeForToken(String code) {
    try {
      WebClient webClient = webClientBuilder.baseUrl("https://accounts.spotify.com").build();

      MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
      formData.add("grant_type", "authorization_code");
      formData.add("code", code);
      formData.add("redirect_uri", spotifyRedirectUri);
      formData.add("client_id", spotifyClientId);
      formData.add("client_secret", spotifyClientSecret);

      return webClient.post()
          .uri("/api/token")
          .contentType(MediaType.APPLICATION_FORM_URLENCODED)
          .body(BodyInserters.fromFormData(formData))
          .retrieve()
          .bodyToMono(SpotifyTokenResponse.class)
          .block();
    } catch (WebClientResponseException e) {
      log.error("Failed to exchange authorization code for token: HTTP {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
      throw new RuntimeException("Failed to exchange authorization code for access token", e);
    } catch (Exception e) {
      log.error("Error during token exchange with Spotify", e);
      throw new RuntimeException("Error during token exchange with Spotify", e);
    }
  }

  private SpotifyUserProfile getSpotifyUserProfile(String accessToken) {
    try {
      WebClient webClient = webClientBuilder.baseUrl("https://api.spotify.com").build();

      return webClient.get()
          .uri("/v1/me")
          .header("Authorization", "Bearer " + accessToken)
          .retrieve()
          .bodyToMono(SpotifyUserProfile.class)
          .block();
    } catch (WebClientResponseException e) {
      log.error("Failed to fetch Spotify user profile: HTTP {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
      throw new RuntimeException("Failed to fetch Spotify user profile", e);
    } catch (Exception e) {
      log.error("Error fetching Spotify user profile", e);
      throw new RuntimeException("Error fetching Spotify user profile", e);
    }
  }
}
