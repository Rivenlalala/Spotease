package com.spotease.service;

import com.spotease.model.User;
import com.spotease.repository.UserRepository;
import com.spotease.util.TokenEncryption;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import se.michaelthelin.spotify.SpotifyApi;
import se.michaelthelin.spotify.model_objects.credentials.AuthorizationCodeCredentials;
import se.michaelthelin.spotify.requests.authorization.authorization_code.AuthorizationCodeRequest;
import se.michaelthelin.spotify.requests.authorization.authorization_code.AuthorizationCodeUriRequest;
import se.michaelthelin.spotify.requests.data.users_profile.GetCurrentUsersProfileRequest;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

  private final UserRepository userRepository;
  private final TokenEncryption tokenEncryption;
  private final SpotifyApi spotifyApi;

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
}
