package com.spotease.service;

import com.spotease.dto.netease.NeteaseQRKey;
import com.spotease.dto.netease.NeteaseQRStatus;
import com.spotease.dto.netease.NeteaseUserProfile;
import com.spotease.model.User;
import com.spotease.repository.UserRepository;
import com.spotease.util.TokenEncryption;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Optional;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  @Mock
  private UserRepository userRepository;

  @Mock
  private TokenEncryption tokenEncryption;

  @Mock
  private WebClient webClient;

  @Mock
  private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;

  @Mock
  private WebClient.RequestHeadersSpec requestHeadersSpec;

  @Mock
  private WebClient.ResponseSpec responseSpec;

  @InjectMocks
  private AuthService authService;

  @Test
  void testGenerateNeteaseQRKey_Success() {
    // Arrange
    NeteaseQRKey qrKey = new NeteaseQRKey();
    qrKey.setCode(200);
    NeteaseQRKey.NeteaseQRKeyData data = new NeteaseQRKey.NeteaseQRKeyData();
    data.setUnikey("test-qr-key-123");
    qrKey.setData(data);

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(qrKey));

    // Act
    String result = authService.generateNeteaseQRKey();

    // Assert
    assertEquals("test-qr-key-123", result);
    verify(webClient).get();
  }

  @Test
  void testCheckNeteaseQRStatus_Waiting() {
    // Arrange
    NeteaseQRStatus status = new NeteaseQRStatus();
    status.setCode(801);
    status.setMessage("等待扫码");

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(status));

    // Act
    NeteaseQRStatus result = authService.checkNeteaseQRStatus("test-key");

    // Assert
    assertEquals(801, result.getCode());
    assertEquals("等待扫码", result.getMessage());
  }

  @Test
  void testCheckNeteaseQRStatus_Success() {
    // Arrange
    NeteaseQRStatus status = new NeteaseQRStatus();
    status.setCode(803);
    status.setCookie("MUSIC_U=test_cookie_value");
    status.setMessage("授权登录成功");

    when(webClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
        .thenReturn(Mono.just(status));

    // Act
    NeteaseQRStatus result = authService.checkNeteaseQRStatus("test-key");

    // Assert
    assertEquals(803, result.getCode());
    assertNotNull(result.getCookie());
    assertTrue(result.getCookie().contains("MUSIC_U"));
  }
}
