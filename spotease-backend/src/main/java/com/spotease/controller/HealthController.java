package com.spotease.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

  @GetMapping("/health")
  public ResponseEntity<?> health() {
    return ResponseEntity.ok(Map.of(
        "status", "UP",
        "timestamp", LocalDateTime.now(),
        "service", "spotease-backend"
    ));
  }
}
