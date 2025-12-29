package com.spotease.controller;

import com.spotease.dto.netease.NeteaseQRStatus;
import com.spotease.model.User;
import com.spotease.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

  private MockMvc mockMvc;

  @Mock
  private AuthService authService;

  @InjectMocks
  private AuthController authController;

  private MockHttpSession authenticatedSession;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(authController).build();

    authenticatedSession = new MockHttpSession();
    authenticatedSession.setAttribute("userId", 1L);
  }

  @Test
  void testGenerateNeteaseQR_Success() throws Exception {
    // Arrange
    when(authService.generateNeteaseQRKey()).thenReturn("test-qr-key-abc123");

    // Act & Assert
    mockMvc.perform(post("/api/auth/netease/qr")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.qrKey", is("test-qr-key-abc123")))
        .andExpect(jsonPath("$.qrUrl", containsString("test-qr-key-abc123")));

    verify(authService).generateNeteaseQRKey();
  }

  @Test
  void testGenerateNeteaseQR_Unauthorized() throws Exception {
    // Act & Assert
    mockMvc.perform(post("/api/auth/netease/qr"))
        .andExpect(status().isUnauthorized());

    verifyNoInteractions(authService);
  }

  @Test
  void testCheckNeteaseQRStatus_Waiting() throws Exception {
    // Arrange
    NeteaseQRStatus status = new NeteaseQRStatus();
    status.setCode(801);
    status.setMessage("等待扫码");

    when(authService.checkNeteaseQRStatus("test-key")).thenReturn(status);

    // Act & Assert
    mockMvc.perform(get("/api/auth/netease/qr/status")
            .param("key", "test-key")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("WAITING")))
        .andExpect(jsonPath("$.message", is("等待扫码")));

    verify(authService).checkNeteaseQRStatus("test-key");
  }

  @Test
  void testCheckNeteaseQRStatus_Success() throws Exception {
    // Arrange
    NeteaseQRStatus status = new NeteaseQRStatus();
    status.setCode(803);
    status.setCookie("MUSIC_U=test_cookie_value");
    status.setMessage("授权登录成功");

    User user = new User();
    user.setId(1L);
    user.setNeteaseUserId("12345");

    when(authService.checkNeteaseQRStatus("test-key")).thenReturn(status);
    when(authService.handleNeteaseQRLogin(1L, "MUSIC_U=test_cookie_value"))
        .thenReturn(user);

    // Act & Assert
    mockMvc.perform(get("/api/auth/netease/qr/status")
            .param("key", "test-key")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("SUCCESS")))
        .andExpect(jsonPath("$.message", is("授权登录成功")));

    verify(authService).checkNeteaseQRStatus("test-key");
    verify(authService).handleNeteaseQRLogin(1L, "MUSIC_U=test_cookie_value");
  }

  @Test
  void testCheckNeteaseQRStatus_Expired() throws Exception {
    // Arrange
    NeteaseQRStatus status = new NeteaseQRStatus();
    status.setCode(800);
    status.setMessage("二维码已过期");

    when(authService.checkNeteaseQRStatus("test-key")).thenReturn(status);

    // Act & Assert
    mockMvc.perform(get("/api/auth/netease/qr/status")
            .param("key", "test-key")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("EXPIRED")))
        .andExpect(jsonPath("$.message", is("二维码已过期")));

    verify(authService).checkNeteaseQRStatus("test-key");
    verify(authService, never()).handleNeteaseQRLogin(anyLong(), anyString());
  }

  @Test
  void testCheckNeteaseQRStatus_MissingKey() throws Exception {
    // Act & Assert
    mockMvc.perform(get("/api/auth/netease/qr/status")
            .session(authenticatedSession))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(authService);
  }

  @Test
  void testSpotifyCallback_Success_RedirectsToFrontend() throws Exception {
    // Arrange
    MockHttpSession session = new MockHttpSession();
    session.setAttribute("spotify_oauth_state", "test-state");

    User user = new User();
    user.setId(1L);
    user.setEmail("test@example.com");

    when(authService.handleSpotifyCallback("test-code")).thenReturn(user);

    // Act & Assert
    mockMvc.perform(get("/api/auth/spotify/callback")
            .param("code", "test-code")
            .param("state", "test-state")
            .session(session))
        .andExpect(status().isFound())
        .andExpect(header().string("Location", "http://127.0.0.1:5173/"));

    verify(authService).handleSpotifyCallback("test-code");
  }
}
