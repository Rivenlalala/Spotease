package com.spotease.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TokenEncryptionTest {

    private TokenEncryption tokenEncryption;
    private final String testKey = "12345678901234567890123456789012"; // 32 chars

    @BeforeEach
    void setUp() {
        tokenEncryption = new TokenEncryption(testKey);
    }

    @Test
    void testEncryptDecryptRoundTrip() {
        String plaintext = "my-secret-token-12345";

        String encrypted = tokenEncryption.encrypt(plaintext);
        String decrypted = tokenEncryption.decrypt(encrypted);

        assertEquals(plaintext, decrypted);
        assertNotEquals(plaintext, encrypted);
    }

    @Test
    void testEncryptProducesDifferentCiphertext() {
        String plaintext = "my-secret-token";

        String encrypted1 = tokenEncryption.encrypt(plaintext);
        String encrypted2 = tokenEncryption.encrypt(plaintext);

        // Due to IV, same plaintext should produce different ciphertext
        assertNotEquals(encrypted1, encrypted2);
    }

    @Test
    void testDecryptWithInvalidCiphertext() {
        assertThrows(RuntimeException.class, () -> {
            tokenEncryption.decrypt("invalid-base64");
        });
    }

    @Test
    void testEncryptWithNullInput() {
        assertThrows(IllegalArgumentException.class, () -> {
            tokenEncryption.encrypt(null);
        });
    }

    @Test
    void testEncryptWithEmptyInput() {
        assertThrows(IllegalArgumentException.class, () -> {
            tokenEncryption.encrypt("");
        });
    }

    @Test
    void testDecryptWithNullInput() {
        assertThrows(IllegalArgumentException.class, () -> {
            tokenEncryption.decrypt(null);
        });
    }

    @Test
    void testDecryptWithEmptyInput() {
        assertThrows(IllegalArgumentException.class, () -> {
            tokenEncryption.decrypt("");
        });
    }

    @Test
    void testDecryptWithTooShortCiphertext() {
        assertThrows(IllegalArgumentException.class, () -> {
            tokenEncryption.decrypt("dG9vc2hvcnQ="); // "tooshort" in base64
        });
    }
}
