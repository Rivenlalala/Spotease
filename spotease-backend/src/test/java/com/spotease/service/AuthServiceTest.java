package com.spotease.service;

import com.spotease.dto.netease.NeteaseQRKey;
import com.spotease.dto.netease.NeteaseQRStatus;
import com.spotease.repository.UserRepository;
import com.spotease.util.TokenEncryption;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import se.michaelthelin.spotify.SpotifyApi;

import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  @Mock
  private UserRepository userRepository;

  @Mock
  private TokenEncryption tokenEncryption;

  @Mock
  private SpotifyApi spotifyApi;

  @Mock
  private WebClient.Builder webClientBuilder;

  @Mock
  private WebClient neteaseWebClient;

  @Mock
  private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;

  @Mock
  private WebClient.RequestHeadersSpec requestHeadersSpec;

  @Mock
  private WebClient.ResponseSpec responseSpec;

  private AuthService authService;

  @BeforeEach
  void setUp() {
    authService = new AuthService(userRepository, tokenEncryption, spotifyApi, webClientBuilder);
    ReflectionTestUtils.setField(authService, "neteaseWebClient", neteaseWebClient);
  }

  @Test
  void testGenerateNeteaseQRKey_Success() {
    // Arrange
    NeteaseQRKey qrKey = new NeteaseQRKey();
    qrKey.setCode(200);
    NeteaseQRKey.NeteaseQRKeyData data = new NeteaseQRKey.NeteaseQRKeyData();
    data.setUnikey("test-qr-key-123");
    qrKey.setData(data);

    when(neteaseWebClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri("/login/qr/key")).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(qrKey));

    // Act
    String result = authService.generateNeteaseQRKey();

    // Assert
    assertThat(result).isEqualTo("test-qr-key-123");
    verify(neteaseWebClient).get();
  }

  @Test
  void testCheckNeteaseQRStatus_Waiting() {
    // Arrange
    NeteaseQRStatus status = new NeteaseQRStatus();
    status.setCode(801);
    status.setMessage("等待扫码");

    when(neteaseWebClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(status));

    // Act
    NeteaseQRStatus result = authService.checkNeteaseQRStatus("test-key");

    // Assert
    assertThat(result.getCode()).isEqualTo(801);
    assertThat(result.getMessage()).isEqualTo("等待扫码");
  }

  @Test
  void testCheckNeteaseQRStatus_Success() {
    // Arrange
    NeteaseQRStatus status = new NeteaseQRStatus();
    status.setCode(803);
    status.setCookie("MUSIC_U=test_cookie_value");
    status.setMessage("授权登录成功");

    when(neteaseWebClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(status));

    // Act
    NeteaseQRStatus result = authService.checkNeteaseQRStatus("test-key");

    // Assert
    assertThat(result.getCode()).isEqualTo(803);
    assertThat(result.getCookie()).isNotNull();
    assertThat(result.getCookie()).contains("MUSIC_U");
  }
}
