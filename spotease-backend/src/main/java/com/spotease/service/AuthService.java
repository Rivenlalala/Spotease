package com.spotease.service;

import com.spotease.dto.AuthStatusResponse;
import com.spotease.dto.netease.NeteaseQRKey;
import com.spotease.dto.netease.NeteaseQRStatus;
import com.spotease.model.User;
import com.spotease.repository.UserRepository;
import com.spotease.util.TokenEncryption;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import se.michaelthelin.spotify.SpotifyApi;
import se.michaelthelin.spotify.model_objects.credentials.AuthorizationCodeCredentials;
import se.michaelthelin.spotify.requests.authorization.authorization_code.AuthorizationCodeRequest;
import se.michaelthelin.spotify.requests.authorization.authorization_code.AuthorizationCodeUriRequest;
import se.michaelthelin.spotify.requests.data.users_profile.GetCurrentUsersProfileRequest;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
@Slf4j
public class AuthService {

  private final UserRepository userRepository;
  private final TokenEncryption tokenEncryption;
  private final SpotifyApi spotifyApi;
  private final WebClient.Builder webClientBuilder;

  @Value("${spotease.netease.api-url}")
  private String neteaseApiUrl;

  // Visible for testing - can be injected directly via reflection in tests
  private WebClient neteaseWebClient;

  public AuthService(UserRepository userRepository, TokenEncryption tokenEncryption,
                     SpotifyApi spotifyApi, WebClient.Builder webClientBuilder) {
    this.userRepository = userRepository;
    this.tokenEncryption = tokenEncryption;
    this.spotifyApi = spotifyApi;
    this.webClientBuilder = webClientBuilder;
  }

  @PostConstruct
  public void initNeteaseClient() {
    if (neteaseWebClient == null) {
      this.neteaseWebClient = webClientBuilder
          .baseUrl(neteaseApiUrl)
          .build();
    }
  }

  public String getSpotifyAuthUrl(String state) {
    AuthorizationCodeUriRequest authorizationCodeUriRequest = spotifyApi.authorizationCodeUri()
        .scope("user-read-email,playlist-read-private,playlist-read-collaborative,playlist-modify-public,playlist-modify-private")
        .state(state)
        .build();

    return authorizationCodeUriRequest.execute().toString();
  }

  public User handleSpotifyCallback(String code) {
    try {
      // Exchange code for tokens
      AuthorizationCodeCredentials credentials = exchangeCodeForToken(code);

      // Create temporary API instance with access token
      SpotifyApi authenticatedApi = new SpotifyApi.Builder()
          .setAccessToken(credentials.getAccessToken())
          .build();

      // Get user profile
      se.michaelthelin.spotify.model_objects.specification.User profile = getSpotifyUserProfile(authenticatedApi);

      // Create or update user
      User user = userRepository.findBySpotifyUserId(profile.getId())
          .orElse(new User());

      user.setSpotifyUserId(profile.getId());
      user.setEmail(profile.getEmail());
      user.setSpotifyAccessToken(tokenEncryption.encrypt(credentials.getAccessToken()));
      user.setSpotifyRefreshToken(tokenEncryption.encrypt(credentials.getRefreshToken()));
      user.setSpotifyTokenExpiry(LocalDateTime.now().plusSeconds(credentials.getExpiresIn()));

      return userRepository.save(user);
    } catch (Exception e) {
      log.error("Error handling Spotify callback", e);
      throw new RuntimeException("Error handling Spotify callback", e);
    }
  }

  private AuthorizationCodeCredentials exchangeCodeForToken(String code) {
    try {
      AuthorizationCodeRequest authorizationCodeRequest = spotifyApi.authorizationCode(code)
          .build();

      return authorizationCodeRequest.execute();
    } catch (Exception e) {
      log.error("Failed to exchange authorization code for token: {}", e.getMessage());
      throw new RuntimeException("Failed to exchange authorization code for access token", e);
    }
  }

  private se.michaelthelin.spotify.model_objects.specification.User getSpotifyUserProfile(SpotifyApi authenticatedApi) {
    try {
      GetCurrentUsersProfileRequest getCurrentUsersProfile = authenticatedApi.getCurrentUsersProfile()
          .build();

      return getCurrentUsersProfile.execute();
    } catch (Exception e) {
      log.error("Failed to fetch Spotify user profile: {}", e.getMessage());
      throw new RuntimeException("Failed to fetch Spotify user profile", e);
    }
  }

  public String generateNeteaseQRKey() {
    try {
      NeteaseQRKey response = neteaseWebClient
          .get()
          .uri("/login/qr/key")
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseQRKey>() {})
          .timeout(Duration.ofSeconds(10))
          .block();

      if (response == null || response.getCode() != 200 || response.getData() == null) {
        throw new RuntimeException("Failed to generate NetEase QR key");
      }

      return response.getData().getUnikey();
    } catch (Exception e) {
      log.error("Failed to generate NetEase QR key: {}", e.getMessage());
      throw new RuntimeException("Failed to generate NetEase QR key", e);
    }
  }

  public NeteaseQRStatus checkNeteaseQRStatus(String key) {
    try {
      NeteaseQRStatus response = neteaseWebClient
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/login/qr/check")
              .queryParam("key", key)
              .queryParam("timestamp", System.currentTimeMillis())
              .build())
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseQRStatus>() {})
          .timeout(Duration.ofSeconds(10))
          .block();

      if (response == null) {
        throw new RuntimeException("Failed to check NetEase QR status");
      }

      return response;
    } catch (Exception e) {
      log.error("Failed to check NetEase QR status: {}", e.getMessage());
      throw new RuntimeException("Failed to check NetEase QR status", e);
    }
  }

  public User handleNeteaseQRLogin(Long userId, String cookie) {
    log.info("Processing NetEase QR login for user {}", userId);

    // Validate the cookie first by calling NetEase API
    validateNeteaseCookie(cookie);

    try {
      User user = userRepository.findById(userId)
          .orElseThrow(() -> new RuntimeException("User not found"));

      // Store the encrypted cookie
      String encryptedCookie = tokenEncryption.encrypt(cookie);
      user.setNeteaseCookie(encryptedCookie);

      // Set expiry (NetEase cookies typically valid for ~1 year, we'll use 30 days to be safe)
      user.setNeteaseCookieExpiry(LocalDateTime.now().plusDays(30));

      return userRepository.save(user);
    } catch (Exception e) {
      log.error("Failed to process NetEase QR login for user {}: {}", userId, e.getMessage());
      throw new RuntimeException("Failed to process NetEase QR login", e);
    }
  }

  private void validateNeteaseCookie(String cookie) {
    try {
      var response = neteaseWebClient
          .get()
          .uri("/login/status")
          .header("Cookie", cookie)
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<java.util.Map<String, Object>>() {})
          .timeout(Duration.ofSeconds(10))
          .block();

      if (response == null) {
        throw new IllegalArgumentException("Invalid cookie: no response from NetEase");
      }

      // Check if account exists in response (indicates valid login)
      Object data = response.get("data");
      if (data instanceof java.util.Map) {
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> dataMap = (java.util.Map<String, Object>) data;
        Object account = dataMap.get("account");
        if (account == null) {
          throw new IllegalArgumentException("Invalid cookie: not logged in");
        }
      } else {
        throw new IllegalArgumentException("Invalid cookie: unexpected response format");
      }

      log.info("NetEase cookie validated successfully");
    } catch (IllegalArgumentException e) {
      throw e;
    } catch (Exception e) {
      log.error("Failed to validate NetEase cookie: {}", e.getMessage());
      throw new IllegalArgumentException("Invalid cookie: verification failed", e);
    }
  }

  public AuthStatusResponse getUserConnectionStatus(Long userId) {
    User user = userRepository.findById(userId).orElse(null);

    if (user == null) {
      return AuthStatusResponse.builder()
          .authenticated(false)
          .spotifyConnected(false)
          .neteaseConnected(false)
          .build();
    }

    boolean spotifyConnected = user.getSpotifyAccessToken() != null
        && !user.getSpotifyAccessToken().isEmpty();
    boolean neteaseConnected = user.getNeteaseCookie() != null
        && !user.getNeteaseCookie().isEmpty();

    return AuthStatusResponse.builder()
        .authenticated(true)
        .userId(userId)
        .spotifyConnected(spotifyConnected)
        .neteaseConnected(neteaseConnected)
        .build();
  }
}
