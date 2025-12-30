package com.spotease.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "track_matches")
@Data
public class TrackMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversion_job_id", nullable = false)
    private ConversionJob conversionJob;

    // Source track info
    @Column(nullable = false)
    private String sourceTrackId;

    @Column(nullable = false)
    private String sourceTrackName;

    @Column(nullable = false)
    private String sourceArtist;

    private String sourceAlbum;

    private Integer sourceDuration;  // in seconds

    private String sourceISRC;

    private String sourceImageUrl;

    // Destination track info
    private String destinationTrackId;
    private String destinationTrackName;
    private String destinationArtist;
    private Integer destinationDuration;  // in seconds
    private String destinationImageUrl;

    // Match metadata
    private Double matchConfidence;  // 0.0 - 1.0

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchStatus status;

    @Column(length = 1024)
    private String errorMessage;

    private LocalDateTime reviewedAt;
    private LocalDateTime appliedAt;
}
