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
    user.setNeteaseUserId(456L);
    user.setNeteaseCookie("encrypted_netease_cookie");
  }
}
