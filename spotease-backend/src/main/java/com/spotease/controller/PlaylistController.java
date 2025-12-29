package com.spotease.controller;

import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.model.User;
import com.spotease.repository.UserRepository;
import com.spotease.service.NeteaseService;
import com.spotease.service.SpotifyService;
import com.spotease.util.TokenEncryption;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/playlists")
@RequiredArgsConstructor
@Slf4j
public class PlaylistController {

  private final SpotifyService spotifyService;
  private final NeteaseService neteaseService;
  private final UserRepository userRepository;
  private final TokenEncryption tokenEncryption;

  @GetMapping("/spotify")
  public ResponseEntity<List<SpotifyPlaylist>> getSpotifyPlaylists(HttpSession session) {
    Long userId = getUserIdFromSession(session);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    log.info("Fetching Spotify playlists for user {}", userId);

    User user = userRepository.findById(userId).orElse(null);
    if (user == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    if (user.getSpotifyAccessToken() == null) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }

    try {
      String accessToken = tokenEncryption.decrypt(user.getSpotifyAccessToken());
      List<SpotifyPlaylist> playlists = spotifyService.getPlaylists(accessToken);
      return ResponseEntity.ok(playlists);
    } catch (Exception e) {
      log.error("Failed to fetch Spotify playlists for user {}: {}", userId, e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @GetMapping("/netease")
  public ResponseEntity<List<NeteasePlaylist>> getNeteasePlaylists(HttpSession session) {
    Long userId = getUserIdFromSession(session);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    log.info("Fetching NetEase playlists for user {}", userId);

    User user = userRepository.findById(userId).orElse(null);
    if (user == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    if (user.getNeteaseCookie() == null) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }

    try {
      String cookie = tokenEncryption.decrypt(user.getNeteaseCookie());
      List<NeteasePlaylist> playlists = neteaseService.getPlaylists(cookie);
      return ResponseEntity.ok(playlists);
    } catch (Exception e) {
      log.error("Failed to fetch NetEase playlists for user {}: {}", userId, e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  private Long getUserIdFromSession(HttpSession session) {
    if (session == null) {
      return null;
    }
    Object userIdObj = session.getAttribute("userId");
    if (userIdObj instanceof Long) {
      return (Long) userIdObj;
    }
    return null;
  }
}
