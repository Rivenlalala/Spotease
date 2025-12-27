package com.spotease.repository;

import com.spotease.model.MatchStatus;
import com.spotease.model.TrackMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrackMatchRepository extends JpaRepository<TrackMatch, Long> {
    List<TrackMatch> findByConversionJob_Id(Long conversionJobId);
    List<TrackMatch> findByConversionJob_IdAndStatus(Long conversionJobId, MatchStatus status);
}
