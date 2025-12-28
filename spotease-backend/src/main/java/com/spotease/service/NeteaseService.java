package com.spotease.service;

import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.dto.netease.NeteaseResponse;
import com.spotease.dto.netease.NeteaseTrack;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NeteaseService {

  private final WebClient.Builder webClientBuilder;

  @Value("${spotease.netease.api-url}")
  private String neteaseApiUrl;

  private WebClient getWebClient(String cookie) {
    return webClientBuilder
        .baseUrl(neteaseApiUrl)
        .defaultHeader("Cookie", "MUSIC_U=" + cookie)
        .build();
  }

  public List<NeteasePlaylist> getPlaylists(String cookie) {
    try {
      // Get user account to get userId
      NeteaseResponse<Void> accountResponse = getWebClient(cookie)
          .get()
          .uri("/user/account")
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<Void>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      Long userId = accountResponse.getProfile().getUserId();

      // Get user playlists
      NeteaseResponse<Void> playlistResponse = getWebClient(cookie)
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/user/playlist")
              .queryParam("uid", userId)
              .queryParam("limit", 100)
              .build())
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<Void>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      return playlistResponse.getPlaylist();
    } catch (Exception e) {
      throw new RuntimeException("Failed to get NetEase playlists", e);
    }
  }

  public List<NeteaseTrack> getPlaylistTracks(String cookie, String playlistId) {
    try {
      NeteaseResponse<NeteaseResponse.NeteasePlaylistWrapper> response = getWebClient(cookie)
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/playlist/detail")
              .queryParam("id", playlistId)
              .build())
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<NeteaseResponse.NeteasePlaylistWrapper>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      // Response has {playlist: {tracks: [...]}}
      return response.getData() != null && response.getData().getPlaylist() != null
          ? response.getData().getPlaylist().getTracks()
          : List.of();
    } catch (Exception e) {
      throw new RuntimeException("Failed to get playlist tracks", e);
    }
  }

  public List<NeteaseTrack> searchTrack(String cookie, String query) {
    try {
      NeteaseResponse<Void> response = getWebClient(cookie)
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/cloudsearch")
              .queryParam("keywords", query)
              .queryParam("type", 1)  // 1 = single track
              .queryParam("limit", 10)
              .build())
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<Void>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      return response.getResult() != null ? response.getResult().getSongs() : List.of();
    } catch (Exception e) {
      throw new RuntimeException("Failed to search tracks", e);
    }
  }

  public void addTracksToPlaylist(String cookie, String playlistId, List<String> trackIds) {
    try {
      String trackIdsParam = String.join(",", trackIds);

      getWebClient(cookie)
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/playlist/tracks")
              .queryParam("op", "add")
              .queryParam("pid", playlistId)
              .queryParam("tracks", trackIdsParam)
              .build())
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<Void>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();
    } catch (Exception e) {
      throw new RuntimeException("Failed to add tracks to playlist", e);
    }
  }
}
