package com.spotease.exception;

/**
 * Exception thrown when NetEase API returns code 301 indicating
 * the user's session/cookie has expired and needs re-authentication.
 */
public class NeteaseSessionExpiredException extends RuntimeException {

  public NeteaseSessionExpiredException() {
    super("NetEase session has expired. Please re-login.");
  }

  public NeteaseSessionExpiredException(String message) {
    super(message);
  }
}
