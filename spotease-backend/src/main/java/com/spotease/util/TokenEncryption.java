package com.spotease.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class TokenEncryption {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int GCM_IV_LENGTH = 12;

    private final SecretKey secretKey;
    private final SecureRandom secureRandom;

    public TokenEncryption(@Value("${spotease.encryption.key}") String key) {
        if (key == null || key.length() != 32) {
            throw new IllegalArgumentException("Encryption key must be 32 characters");
        }
        this.secretKey = new SecretKeySpec(key.getBytes(), "AES");
        this.secureRandom = new SecureRandom();
    }

    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) {
            throw new IllegalArgumentException("Plaintext must not be null or empty");
        }

        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Prepend IV to ciphertext
            byte[] combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed: " + e.getClass().getSimpleName(), e);
        }
    }

    public String decrypt(String ciphertext) {
        if (ciphertext == null || ciphertext.isEmpty()) {
            throw new IllegalArgumentException("Ciphertext must not be null or empty");
        }

        try {
            byte[] combined = Base64.getDecoder().decode(ciphertext);

            if (combined.length < GCM_IV_LENGTH) {
                throw new IllegalArgumentException("Ciphertext too short to contain IV");
            }

            // Extract IV and ciphertext
            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] encryptedData = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, iv.length);
            System.arraycopy(combined, iv.length, encryptedData, 0, encryptedData.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            byte[] plaintext = cipher.doFinal(encryptedData);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed: " + e.getClass().getSimpleName(), e);
        }
    }
}
