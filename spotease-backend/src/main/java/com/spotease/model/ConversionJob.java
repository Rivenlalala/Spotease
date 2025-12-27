package com.spotease.model;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "conversion_jobs")
@Data
@EntityListeners(AuditingEntityListener.class)
public class ConversionJob {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Platform sourcePlatform;

  @Column(nullable = false)
  private String sourcePlaylistId;

  @Column(nullable = false)
  private String sourcePlaylistName;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Platform destinationPlatform;

  private String destinationPlaylistId;  // Nullable for CREATE mode

  @Column(nullable = false)
  private String destinationPlaylistName;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ConversionMode mode;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private JobStatus status;

  @CreatedDate
  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  @Column(nullable = false)
  private LocalDateTime updatedAt;

  private LocalDateTime completedAt;

  // Progress tracking
  private Integer totalTracks = 0;
  private Integer processedTracks = 0;
  private Integer highConfidenceMatches = 0;
  private Integer lowConfidenceMatches = 0;
  private Integer failedTracks = 0;
}
