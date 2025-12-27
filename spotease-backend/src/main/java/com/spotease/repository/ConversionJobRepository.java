package com.spotease.repository;

import com.spotease.model.ConversionJob;
import com.spotease.model.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversionJobRepository extends JpaRepository<ConversionJob, Long> {
    List<ConversionJob> findByUser_Id(Long userId);
    List<ConversionJob> findByUser_IdAndStatus(Long userId, JobStatus status);
}
