package com.spotease.controller;

import com.spotease.model.User;
import com.spotease.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @GetMapping("/spotify/login")
  public ResponseEntity<?> spotifyLogin(HttpSession session) {
    String state = UUID.randomUUID().toString();
    session.setAttribute("spotify_oauth_state", state);

    String authUrl = authService.getSpotifyAuthUrl(state);
    return ResponseEntity.ok(Map.of("authUrl", authUrl));
  }

  @GetMapping("/spotify/callback")
  public ResponseEntity<?> spotifyCallback(
      @RequestParam(required = false) String code,
      @RequestParam(required = false) String state,
      HttpSession session) {

    // Validate input parameters
    if (code == null || code.trim().isEmpty()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Missing authorization code"));
    }

    if (state == null || state.trim().isEmpty()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Missing state parameter"));
    }

    // Validate state against session (CSRF protection)
    String sessionState = (String) session.getAttribute("spotify_oauth_state");
    if (sessionState == null || !sessionState.equals(state)) {
      return ResponseEntity.badRequest().body(Map.of("error", "Invalid state parameter"));
    }

    // Clear OAuth state after validation (one-time use)
    session.removeAttribute("spotify_oauth_state");

    // Handle OAuth callback
    User user = authService.handleSpotifyCallback(code);

    // Store user in session
    session.setAttribute("userId", user.getId());

    return ResponseEntity.ok(Map.of(
        "success", true,
        "userId", user.getId(),
        "email", user.getEmail()
    ));
  }

  @GetMapping("/status")
  public ResponseEntity<?> getAuthStatus(HttpSession session) {
    Long userId = (Long) session.getAttribute("userId");

    if (userId == null) {
      return ResponseEntity.ok(Map.of(
          "authenticated", false,
          "spotifyConnected", false,
          "neteaseConnected", false
      ));
    }

    // In real implementation, fetch user and check token validity
    return ResponseEntity.ok(Map.of(
        "authenticated", true,
        "userId", userId,
        "spotifyConnected", true,
        "neteaseConnected", false
    ));
  }

  @PostMapping("/logout")
  public ResponseEntity<?> logout(HttpSession session) {
    session.invalidate();
    return ResponseEntity.ok(Map.of("success", true));
  }
}
