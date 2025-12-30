package com.spotease.service;

import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.dto.netease.NeteasePlaylistDetailResponse;
import com.spotease.dto.netease.NeteasePlaylistTracksResponse;
import com.spotease.dto.netease.NeteaseResponse;
import com.spotease.dto.netease.NeteaseTrack;
import jakarta.annotation.PostConstruct;
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

  private WebClient webClient;

  @PostConstruct
  public void init() {
    this.webClient = webClientBuilder
        .baseUrl(neteaseApiUrl)
        .build();
  }

  public List<NeteasePlaylist> getPlaylists(String cookie) {
    try {
      // Get user account to get userId
      NeteaseResponse<Void> accountResponse = webClient
          .get()
          .uri("/user/account")
          .header("Cookie", cookie)
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<Void>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      // Validate account response
      if (accountResponse == null) {
        throw new RuntimeException("Account response is null");
      }
      if (accountResponse.getCode() != 200) {
        throw new RuntimeException("NetEase API returned error code: " + accountResponse.getCode());
      }
      if (accountResponse.getProfile() == null) {
        throw new RuntimeException("Account profile is null");
      }

      Long userId = accountResponse.getProfile().getUserId();

      // Get user playlists
      NeteaseResponse<Void> playlistResponse = webClient
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/user/playlist")
              .queryParam("uid", userId)
              .queryParam("limit", 100)
              .build())
          .header("Cookie", cookie)
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<Void>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      // Validate playlist response
      if (playlistResponse == null) {
        throw new RuntimeException("Playlist response is null");
      }
      if (playlistResponse.getCode() != 200) {
        throw new RuntimeException("NetEase API returned error code: " + playlistResponse.getCode());
      }

      return playlistResponse.getPlaylist();
    } catch (Exception e) {
      throw new RuntimeException("Failed to get NetEase playlists", e);
    }
  }

  public NeteasePlaylist getPlaylistById(String cookie, String playlistId) {
    try {
      NeteasePlaylistDetailResponse response = webClient
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/playlist/detail")
              .queryParam("id", playlistId)
              .build())
          .header("Cookie", cookie)
          .retrieve()
          .bodyToMono(NeteasePlaylistDetailResponse.class)
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      // Validate response
      if (response == null) {
        throw new RuntimeException("Playlist response is null");
      }
      if (response.getCode() != 200) {
        throw new RuntimeException("NetEase API returned error code: " + response.getCode());
      }
      if (response.getPlaylist() == null) {
        throw new RuntimeException("Playlist data is null");
      }

      // Map to NeteasePlaylist DTO
      NeteasePlaylistDetailResponse.NeteasePlaylistDetail playlistDetail = response.getPlaylist();
      NeteasePlaylist dto = new NeteasePlaylist();
      dto.setId(playlistDetail.getId());
      dto.setName(playlistDetail.getName());
      dto.setDescription(playlistDetail.getDescription());
      dto.setTotalTracks(playlistDetail.getTracks() != null ? playlistDetail.getTracks().size() : 0);
      dto.setCoverImgUrl(playlistDetail.getCoverImgUrl());
      dto.setUserId(playlistDetail.getUserId());
      return dto;
    } catch (Exception e) {
      throw new RuntimeException("Failed to get NetEase playlist", e);
    }
  }

  public List<NeteaseTrack> getPlaylistTracks(String cookie, String playlistId) {
    try {
      NeteasePlaylistDetailResponse response = webClient
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/playlist/detail")
              .queryParam("id", playlistId)
              .build())
          .header("Cookie", cookie)
          .retrieve()
          .bodyToMono(NeteasePlaylistDetailResponse.class)
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      // Validate response
      if (response == null) {
        throw new RuntimeException("Playlist tracks response is null");
      }
      if (response.getCode() != 200) {
        throw new RuntimeException("NetEase API returned error code: " + response.getCode());
      }

      // Response has {playlist: {tracks: [...]}}
      return response.getPlaylist() != null && response.getPlaylist().getTracks() != null
          ? response.getPlaylist().getTracks()
          : List.of();
    } catch (Exception e) {
      throw new RuntimeException("Failed to get playlist tracks", e);
    }
  }

  public List<NeteaseTrack> searchTrack(String cookie, String query) {
    try {
      NeteaseResponse<Void> response = webClient
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/cloudsearch")
              .queryParam("keywords", query)
              .queryParam("type", 1)  // 1 = single track
              .queryParam("limit", 5)
              .build())
          .header("Cookie", cookie)
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<NeteaseResponse<Void>>() {})
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      // Validate response
      if (response == null) {
        throw new RuntimeException("Search response is null");
      }
      if (response.getCode() != 200) {
        throw new RuntimeException("NetEase API returned error code: " + response.getCode());
      }

      return response.getResult() != null ? response.getResult().getSongs() : List.of();
    } catch (Exception e) {
      throw new RuntimeException("Failed to search tracks", e);
    }
  }

  public void addTracksToPlaylist(String cookie, String playlistId, List<String> trackIds) {
    try {
      String trackIdsParam = String.join(",", trackIds);

      NeteasePlaylistTracksResponse response = webClient
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/playlist/tracks")
              .queryParam("op", "add")
              .queryParam("pid", playlistId)
              .queryParam("tracks", trackIdsParam)
              .build())
          .header("Cookie", cookie)
          .retrieve()
          .bodyToMono(NeteasePlaylistTracksResponse.class)
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      // Validate response
      if (response == null) {
        throw new RuntimeException("Add tracks response is null");
      }
      // Treat duplicate tracks as success (track is already in playlist)
      if (response.isDuplicate()) {
        return; // Track already exists, goal achieved
      }
      if (!response.isSuccess()) {
        Integer status = response.getStatus();
        Integer code = response.getBody() != null ? response.getBody().getCode() : null;
        String message = response.getBody() != null ? response.getBody().getMessage() : null;
        throw new RuntimeException("NetEase API returned error: status=" + status + ", code=" + code + ", message=" + message);
      }
    } catch (Exception e) {
      throw new RuntimeException("Failed to add tracks to playlist", e);
    }
  }

  public String createPlaylist(String cookie, String playlistName) {
    try {
      NeteasePlaylistDetailResponse response = webClient
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/playlist/create")
              .queryParam("name", playlistName)
              .queryParam("privacy", 10) // 10 = private
              .build())
          .header("Cookie", cookie)
          .retrieve()
          .bodyToMono(NeteasePlaylistDetailResponse.class)
          .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
          .block();

      if (response != null && response.getPlaylist() != null) {
        return response.getPlaylist().getId();
      }

      throw new RuntimeException("Failed to create NetEase playlist: Invalid response");
    } catch (Exception e) {
      throw new RuntimeException("Failed to create NetEase playlist", e);
    }
  }
}
