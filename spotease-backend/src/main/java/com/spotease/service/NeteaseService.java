package com.spotease.service;

import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.dto.netease.NeteaseTrack;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NeteaseService {

  private final WebClient.Builder webClientBuilder;

  // TODO: Configure actual NetEase API base URL based on community framework
  private WebClient getWebClient() {
    return webClientBuilder
        .baseUrl("https://netease-cloud-music-api-placeholder.com")
        .build();
  }

  public List<NeteasePlaylist> getPlaylists(String cookie) {
    // TODO: Implement using NetEase community API
    throw new UnsupportedOperationException("NetEase integration not yet implemented");
  }

  public List<NeteaseTrack> getPlaylistTracks(String cookie, String playlistId) {
    // TODO: Implement using NetEase community API
    throw new UnsupportedOperationException("NetEase integration not yet implemented");
  }

  public List<NeteaseTrack> searchTrack(String cookie, String query) {
    // TODO: Implement using NetEase community API
    throw new UnsupportedOperationException("NetEase integration not yet implemented");
  }

  public void addTracksToPlaylist(String cookie, String playlistId, List<String> trackIds) {
    // TODO: Implement using NetEase community API
    throw new UnsupportedOperationException("NetEase integration not yet implemented");
  }
}
