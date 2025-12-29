package com.spotease.service;

import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.dto.netease.NeteasePlaylistDetailResponse;
import com.spotease.dto.netease.NeteaseResponse;
import com.spotease.dto.netease.NeteaseTrack;
import com.spotease.dto.netease.NeteaseUserProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.List;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NeteaseServiceTest {

  @Mock
  private WebClient.Builder webClientBuilder;

  @Mock
  private WebClient webClient;

  @Mock
  private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;

  @Mock
  private WebClient.RequestHeadersSpec requestHeadersSpec;

  @Mock
  private WebClient.ResponseSpec responseSpec;

  private NeteaseService neteaseService;

  @BeforeEach
  void setUp() {
    neteaseService = new NeteaseService(webClientBuilder);

    // Inject the mocked WebClient directly to avoid calling @PostConstruct
    ReflectionTestUtils.setField(neteaseService, "neteaseApiUrl", "http://localhost:3000");
    ReflectionTestUtils.setField(neteaseService, "webClient", webClient);
  }

  @Test
  void shouldGetPlaylists() {
    // Given
    String cookie = "MUSIC_U=test-cookie";
    Long userId = 12345L;

    // Mock account response
    NeteaseUserProfile mockProfile = new NeteaseUserProfile();
    mockProfile.setUserId(userId);

    NeteaseResponse<Void> accountResponse = new NeteaseResponse<>();
    accountResponse.setCode(200);
    accountResponse.setProfile(mockProfile);

    // Mock playlist response
    NeteasePlaylist mockPlaylist = new NeteasePlaylist();
    mockPlaylist.setId("playlist123");
    mockPlaylist.setName("Test Playlist");
    mockPlaylist.setDescription("Test Description");
    mockPlaylist.setTrackCount(10);

    NeteaseResponse<Void> playlistResponse = new NeteaseResponse<>();
    playlistResponse.setCode(200);
    playlistResponse.setPlaylist(List.of(mockPlaylist));

    // Mock WebClient chain for account call
    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenAnswer(invocation -> {
      Function<UriBuilder, URI> uriFunction = invocation.getArgument(0);
      // Simulate URI building
      return requestHeadersSpec;
    });
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);

    // First call (account) returns accountResponse, second call (playlists) returns playlistResponse
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(accountResponse))
        .thenReturn(Mono.just(playlistResponse));

    // When
    List<NeteasePlaylist> result = neteaseService.getPlaylists(cookie);

    // Then
    assertThat(result).hasSize(1);
    assertThat(result.get(0).getId()).isEqualTo("playlist123");
    assertThat(result.get(0).getName()).isEqualTo("Test Playlist");
    assertThat(result.get(0).getDescription()).isEqualTo("Test Description");
    assertThat(result.get(0).getTrackCount()).isEqualTo(10);

    // Verify interactions
    verify(webClient, times(2)).get();
    verify(requestHeadersSpec, times(2)).header("Cookie", cookie);
  }

  @Test
  void shouldThrowExceptionWhenAccountResponseIsNull() {
    // Given
    String cookie = "test-cookie";

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class))).thenReturn(Mono.empty());

    // When / Then
    assertThatThrownBy(() -> neteaseService.getPlaylists(cookie))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("Failed to get NetEase playlists");
  }

  @Test
  void shouldThrowExceptionWhenAccountResponseCodeIsNot200() {
    // Given
    String cookie = "test-cookie";

    NeteaseResponse<Void> accountResponse = new NeteaseResponse<>();
    accountResponse.setCode(401);

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(accountResponse));

    // When / Then
    assertThatThrownBy(() -> neteaseService.getPlaylists(cookie))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("Failed to get NetEase playlists");
  }

  @Test
  void shouldThrowExceptionWhenAccountProfileIsNull() {
    // Given
    String cookie = "test-cookie";
    NeteaseResponse<Void> accountResponse = new NeteaseResponse<>();
    accountResponse.setCode(200);
    accountResponse.setProfile(null);  // Profile is null

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(accountResponse));

    // When / Then
    assertThatThrownBy(() -> neteaseService.getPlaylists(cookie))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("Failed to get NetEase playlists");
  }

  @Test
  void shouldGetPlaylistTracks() {
    // Given
    String cookie = "MUSIC_U=test-cookie";
    String playlistId = "playlist123";

    // Mock track
    NeteaseTrack mockTrack = new NeteaseTrack();
    mockTrack.setId("track123");
    mockTrack.setName("Test Track");
    mockTrack.setDuration(180000);

    NeteaseTrack.NeteaseArtist mockArtist = new NeteaseTrack.NeteaseArtist();
    mockArtist.setId("artist123");
    mockArtist.setName("Test Artist");
    mockTrack.setArtists(List.of(mockArtist));

    NeteaseTrack.NeteaseAlbum mockAlbum = new NeteaseTrack.NeteaseAlbum();
    mockAlbum.setId("album123");
    mockAlbum.setName("Test Album");
    mockTrack.setAlbum(mockAlbum);

    // Mock playlist detail
    NeteasePlaylistDetailResponse.NeteasePlaylistDetail playlistDetail = new NeteasePlaylistDetailResponse.NeteasePlaylistDetail();
    playlistDetail.setId(playlistId);
    playlistDetail.setTracks(List.of(mockTrack));

    // Mock response
    NeteasePlaylistDetailResponse response = new NeteasePlaylistDetailResponse();
    response.setCode(200);
    response.setPlaylist(playlistDetail);

    // Mock WebClient chain
    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(NeteasePlaylistDetailResponse.class))
        .thenReturn(Mono.just(response));

    // When
    List<NeteaseTrack> result = neteaseService.getPlaylistTracks(cookie, playlistId);

    // Then
    assertThat(result).hasSize(1);
    assertThat(result.get(0).getId()).isEqualTo("track123");
    assertThat(result.get(0).getName()).isEqualTo("Test Track");
    assertThat(result.get(0).getDuration()).isEqualTo(180000);
    assertThat(result.get(0).getArtists()).hasSize(1);
    assertThat(result.get(0).getArtists().get(0).getName()).isEqualTo("Test Artist");
    assertThat(result.get(0).getAlbum().getName()).isEqualTo("Test Album");

    // Verify interactions
    verify(webClient).get();
    verify(requestHeadersSpec).header("Cookie", cookie);
  }

  @Test
  void shouldReturnEmptyListWhenPlaylistTracksDataIsNull() {
    // Given
    String cookie = "MUSIC_U=test-cookie";
    String playlistId = "playlist123";

    NeteasePlaylistDetailResponse response = new NeteasePlaylistDetailResponse();
    response.setCode(200);
    response.setPlaylist(null);

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(NeteasePlaylistDetailResponse.class))
        .thenReturn(Mono.just(response));

    // When
    List<NeteaseTrack> result = neteaseService.getPlaylistTracks(cookie, playlistId);

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  void shouldThrowExceptionWhenPlaylistTracksResponseIsNull() {
    // Given
    String cookie = "MUSIC_U=test-cookie";
    String playlistId = "playlist123";

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(NeteasePlaylistDetailResponse.class)).thenReturn(Mono.empty());

    // When / Then
    assertThatThrownBy(() -> neteaseService.getPlaylistTracks(cookie, playlistId))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("Failed to get playlist tracks");
  }

  @Test
  void shouldThrowExceptionWhenPlaylistTracksResponseCodeIsNot200() {
    // Given
    String cookie = "MUSIC_U=test-cookie";
    String playlistId = "playlist123";

    NeteasePlaylistDetailResponse response = new NeteasePlaylistDetailResponse();
    response.setCode(404);

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(NeteasePlaylistDetailResponse.class))
        .thenReturn(Mono.just(response));

    // When / Then
    assertThatThrownBy(() -> neteaseService.getPlaylistTracks(cookie, playlistId))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("Failed to get playlist tracks");
  }

  @Test
  void shouldSearchTrack() {
    // Given
    String cookie = "MUSIC_U=test-cookie";
    String query = "test song";

    // Mock track
    NeteaseTrack mockTrack = new NeteaseTrack();
    mockTrack.setId("track456");
    mockTrack.setName("Found Track");
    mockTrack.setDuration(200000);

    NeteaseTrack.NeteaseArtist mockArtist = new NeteaseTrack.NeteaseArtist();
    mockArtist.setName("Found Artist");
    mockTrack.setArtists(List.of(mockArtist));

    // Mock search result
    NeteaseResponse.NeteaseSearchResult searchResult = new NeteaseResponse.NeteaseSearchResult();
    searchResult.setSongs(List.of(mockTrack));
    searchResult.setSongCount(1);

    // Mock response
    NeteaseResponse<Void> response = new NeteaseResponse<>();
    response.setCode(200);
    response.setResult(searchResult);

    // Mock WebClient chain
    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(response));

    // When
    List<NeteaseTrack> result = neteaseService.searchTrack(cookie, query);

    // Then
    assertThat(result).hasSize(1);
    assertThat(result.get(0).getId()).isEqualTo("track456");
    assertThat(result.get(0).getName()).isEqualTo("Found Track");
    assertThat(result.get(0).getDuration()).isEqualTo(200000);
    assertThat(result.get(0).getArtists().get(0).getName()).isEqualTo("Found Artist");

    // Verify interactions
    verify(webClient).get();
    verify(requestHeadersSpec).header("Cookie", cookie);
  }

  @Test
  void shouldReturnEmptyListWhenSearchResultIsNull() {
    // Given
    String cookie = "test-cookie";
    String query = "test song";

    NeteaseResponse<Void> response = new NeteaseResponse<>();
    response.setCode(200);
    response.setResult(null);

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(response));

    // When
    List<NeteaseTrack> result = neteaseService.searchTrack(cookie, query);

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  void shouldThrowExceptionWhenSearchResponseIsNull() {
    // Given
    String cookie = "test-cookie";
    String query = "test song";

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class))).thenReturn(Mono.empty());

    // When / Then
    assertThatThrownBy(() -> neteaseService.searchTrack(cookie, query))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("Failed to search tracks");
  }

  @Test
  void shouldThrowExceptionWhenSearchResponseCodeIsNot200() {
    // Given
    String cookie = "test-cookie";
    String query = "test query";

    NeteaseResponse<Void> response = new NeteaseResponse<>();
    response.setCode(500);

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(response));

    // When / Then
    assertThatThrownBy(() -> neteaseService.searchTrack(cookie, query))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("Failed to search tracks");
  }

  @Test
  void shouldAddTracksToPlaylist() {
    // Given
    String cookie = "MUSIC_U=test-cookie";
    String playlistId = "playlist123";
    List<String> trackIds = List.of("track1", "track2", "track3");

    // Mock response
    NeteaseResponse<Void> response = new NeteaseResponse<>();
    response.setCode(200);

    // Mock WebClient chain
    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(response));

    // When
    neteaseService.addTracksToPlaylist(cookie, playlistId, trackIds);

    // Then
    verify(webClient).get();
    verify(requestHeadersSpec).header("Cookie", cookie);
    verify(responseSpec).bodyToMono(any(ParameterizedTypeReference.class));
  }

  @Test
  void shouldThrowExceptionWhenAddTracksResponseIsNull() {
    // Given
    String cookie = "test-cookie";
    String playlistId = "playlist123";
    List<String> trackIds = List.of("track1", "track2");

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class))).thenReturn(Mono.empty());

    // When / Then
    assertThatThrownBy(() -> neteaseService.addTracksToPlaylist(cookie, playlistId, trackIds))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("Failed to add tracks to playlist");
  }

  @Test
  void shouldThrowExceptionWhenAddTracksResponseCodeIsNot200() {
    // Given
    String cookie = "test-cookie";
    String playlistId = "playlist123";
    List<String> trackIds = List.of("track1");

    NeteaseResponse<Void> response = new NeteaseResponse<>();
    response.setCode(403);

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(response));

    // When / Then
    assertThatThrownBy(() -> neteaseService.addTracksToPlaylist(cookie, playlistId, trackIds))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("Failed to add tracks to playlist");
  }
}
