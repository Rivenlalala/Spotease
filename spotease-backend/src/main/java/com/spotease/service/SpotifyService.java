package com.spotease.service;

import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.dto.spotify.SpotifyTrack;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SpotifyService {

  private final WebClient.Builder webClientBuilder;

  private WebClient getWebClient() {
    return webClientBuilder
        .baseUrl("https://api.spotify.com/v1")
        .build();
  }

  public List<SpotifyPlaylist> getPlaylists(String accessToken) {
    // TODO: Spotify API returns paginated wrapper objects; needs proper response DTOs
    // /me/playlists returns {"items": [...], "total": 50, ...} not direct array
    return List.of(); // Stub - needs wrapper DTO for pagination
  }

  public List<SpotifyTrack> getPlaylistTracks(String accessToken, String playlistId) {
    // TODO: Spotify API returns paginated wrapper objects; needs proper response DTOs
    // /playlists/{id}/tracks returns {"items": [...], ...}
    return List.of(); // Stub - needs wrapper DTO for pagination
  }

  public List<SpotifyTrack> searchTrack(String accessToken, String query) {
    // TODO: Spotify API returns paginated wrapper objects; needs proper response DTOs
    // /search returns {"tracks": {"items": [...], ...}}
    return List.of(); // Stub - needs wrapper DTO for pagination
  }

  public void addTracksToPlaylist(String accessToken, String playlistId, List<String> trackUris) {
    getWebClient()
        .post()
        .uri("/playlists/" + playlistId + "/tracks")
        .header("Authorization", "Bearer " + accessToken)
        .bodyValue(Map.of("uris", trackUris))
        .retrieve()
        .bodyToMono(Void.class)
        .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
        .block();
  }
}
