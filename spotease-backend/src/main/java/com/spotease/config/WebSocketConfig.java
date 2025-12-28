package com.spotease.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

  @Override
  public void configureMessageBroker(MessageBrokerRegistry config) {
    // Enable simple broker for topics
    config.enableSimpleBroker("/topic");
    // Prefix for messages FROM client TO server
    config.setApplicationDestinationPrefixes("/app");
  }

  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    // WebSocket endpoint: ws://localhost:8080/ws/conversions
    registry.addEndpoint("/ws/conversions")
        .setAllowedOrigins("http://localhost:5173", "http://localhost:3000")
        .withSockJS();
  }
}
