package com.spotease.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.model.User;
import com.spotease.repository.UserRepository;
import com.spotease.service.NeteaseService;
import com.spotease.service.SpotifyService;
import com.spotease.util.TokenEncryption;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class PlaylistControllerTest {

  private MockMvc mockMvc;

  private ObjectMapper objectMapper;

  @Mock
  private SpotifyService spotifyService;

  @Mock
  private NeteaseService neteaseService;

  @Mock
  private UserRepository userRepository;

  @Mock
  private TokenEncryption tokenEncryption;

  @InjectMocks
  private PlaylistController playlistController;

  private MockHttpSession authenticatedSession;
  private User user;

  @BeforeEach
  void setUp() {
    // Set up MockMvc with standalone setup
    mockMvc = MockMvcBuilders.standaloneSetup(playlistController).build();

    // Initialize ObjectMapper for JSON handling
    objectMapper = new ObjectMapper();
    objectMapper.findAndRegisterModules(); // Register JavaTimeModule for LocalDateTime

    // Create authenticated session
    authenticatedSession = new MockHttpSession();
    authenticatedSession.setAttribute("userId", 1L);

    // Create test user with platform credentials
    user = new User();
    user.setId(1L);
    user.setEmail("test@example.com");
    user.setSpotifyUserId("spotify123");
    user.setSpotifyAccessToken("encrypted_spotify_token");
    user.setNeteaseUserId("456");
    user.setNeteaseCookie("encrypted_netease_cookie");
  }

  @Test
  void testGetSpotifyPlaylists_Success() throws Exception {
    // Arrange
    SpotifyPlaylist playlist1 = new SpotifyPlaylist();
    playlist1.setId("playlist1");
    playlist1.setName("My Playlist");
    playlist1.setDescription("Test description");
    playlist1.setTrackCount(10);

    SpotifyPlaylist playlist2 = new SpotifyPlaylist();
    playlist2.setId("playlist2");
    playlist2.setName("Another Playlist");
    playlist2.setTrackCount(20);

    List<SpotifyPlaylist> playlists = Arrays.asList(playlist1, playlist2);

    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(tokenEncryption.decrypt("encrypted_spotify_token")).thenReturn("decrypted_token");
    when(spotifyService.getPlaylists("decrypted_token")).thenReturn(playlists);

    // Act & Assert
    mockMvc.perform(get("/api/playlists/spotify")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(2)))
        .andExpect(jsonPath("$[0].id", is("playlist1")))
        .andExpect(jsonPath("$[0].name", is("My Playlist")))
        .andExpect(jsonPath("$[0].trackCount", is(10)))
        .andExpect(jsonPath("$[1].id", is("playlist2")))
        .andExpect(jsonPath("$[1].name", is("Another Playlist")));

    verify(userRepository).findById(1L);
    verify(tokenEncryption).decrypt("encrypted_spotify_token");
    verify(spotifyService).getPlaylists("decrypted_token");
  }

  @Test
  void testGetSpotifyPlaylists_Unauthorized() throws Exception {
    // Act & Assert - no session
    mockMvc.perform(get("/api/playlists/spotify"))
        .andExpect(status().isUnauthorized());

    verifyNoInteractions(spotifyService);
  }

  @Test
  void testGetSpotifyPlaylists_UserNotFound() throws Exception {
    // Arrange
    when(userRepository.findById(1L)).thenReturn(Optional.empty());

    // Act & Assert
    mockMvc.perform(get("/api/playlists/spotify")
            .session(authenticatedSession))
        .andExpect(status().isNotFound());

    verify(userRepository).findById(1L);
    verifyNoInteractions(tokenEncryption);
    verifyNoInteractions(spotifyService);
  }
}
