package com.spotease.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Event published when a conversion job is created and persisted.
 * Used to trigger async processing after transaction commit.
 */
@Getter
public class ConversionJobCreatedEvent extends ApplicationEvent {

    private final Long jobId;

    public ConversionJobCreatedEvent(Object source, Long jobId) {
        super(source);
        this.jobId = jobId;
    }
}
