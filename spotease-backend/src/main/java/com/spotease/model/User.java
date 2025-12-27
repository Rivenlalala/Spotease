package com.spotease.model;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@EntityListeners(AuditingEntityListener.class)
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(unique = true)
  private String email;

  @CreatedDate
  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  @Column(nullable = false)
  private LocalDateTime updatedAt;

  // Spotify fields
  @Column(unique = true)
  private String spotifyUserId;

  @Column(length = 1024)
  private String spotifyAccessToken;  // Encrypted

  @Column(length = 1024)
  private String spotifyRefreshToken; // Encrypted

  private LocalDateTime spotifyTokenExpiry;

  // NetEase fields
  private String neteaseUserId;

  @Column(length = 2048)
  private String neteaseCookie;  // Encrypted

  private LocalDateTime neteaseCookieExpiry;
}
