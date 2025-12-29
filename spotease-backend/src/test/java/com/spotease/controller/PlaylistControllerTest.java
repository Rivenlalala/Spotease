package com.spotease.controller;

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
  private User testUser;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(playlistController).build();

    authenticatedSession = new MockHttpSession();
    authenticatedSession.setAttribute("userId", 1L);

    testUser = new User();
    testUser.setId(1L);
    testUser.setEmail("test@example.com");
    testUser.setSpotifyUserId("spotify123");
    testUser.setSpotifyAccessToken("encrypted_spotify_token");
    testUser.setNeteaseUserId(456L);
    testUser.setNeteaseCookie("encrypted_netease_cookie");
  }
}
