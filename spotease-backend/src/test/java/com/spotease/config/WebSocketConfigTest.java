package com.spotease.config;

import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;

import static org.mockito.Mockito.*;

class WebSocketConfigTest {

  @Test
  void configureMessageBrokerShouldEnableSimpleBroker() {
    WebSocketConfig config = new WebSocketConfig();
    MessageBrokerRegistry registry = mock(MessageBrokerRegistry.class);

    config.configureMessageBroker(registry);

    verify(registry).enableSimpleBroker("/topic");
    verify(registry).setApplicationDestinationPrefixes("/app");
  }

  @Test
  void registerStompEndpointsShouldConfigureEndpoint() {
    WebSocketConfig config = new WebSocketConfig();
    StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
    StompWebSocketEndpointRegistration registration = mock(StompWebSocketEndpointRegistration.class);

    when(registry.addEndpoint("/ws/conversions")).thenReturn(registration);
    when(registration.setAllowedOrigins("http://localhost:5173", "http://localhost:3000"))
        .thenReturn(registration);

    config.registerStompEndpoints(registry);

    verify(registry).addEndpoint("/ws/conversions");
    verify(registration).setAllowedOrigins("http://localhost:5173", "http://localhost:3000");
    verify(registration).withSockJS();
  }
}
