package com.spotease.event;

import com.spotease.worker.ConversionWorker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listens for conversion job events and triggers async processing.
 * Uses @TransactionalEventListener to ensure job is committed before processing starts.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ConversionJobEventListener {

  private final ConversionWorker conversionWorker;

  /**
   * Triggered after the transaction that created the job commits.
   * This prevents race conditions where the async worker tries to load
   * a job that hasn't been committed yet.
   */
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onConversionJobCreated(ConversionJobCreatedEvent event) {
    log.debug("Triggering async processing for conversion job {}", event.getJobId());
    conversionWorker.processConversionJob(event.getJobId());
  }
}
