# Spring Boot Backend Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the foundational Spring Boot backend with authentication, database entities, and external API service layer for Spotease.

**Architecture:** Spring Boot 3.2+ REST API with PostgreSQL database, JPA entities for User/ConversionJob/TrackMatch, session-based authentication via Spring Security, OAuth integration with Spotify, QR authentication with NetEase, and WebClient-based service layer for external APIs.

**Tech Stack:** Spring Boot 3.2+, Spring Data JPA, Spring Security, Spring WebSocket, Spring WebFlux (WebClient), PostgreSQL, Lombok, Maven

---

## Task 1: Initialize Spring Boot Project

**Files:**
- Create: `pom.xml`
- Create: `src/main/java/com/spotease/SpoteaseApplication.java`
- Create: `src/main/resources/application.properties`
- Create: `.gitignore`

**Step 1: Create Maven project structure**

Run:
```bash
mkdir -p spotease-backend
cd spotease-backend
mkdir -p src/main/java/com/spotease
mkdir -p src/main/resources
mkdir -p src/test/java/com/spotease
```

**Step 2: Create pom.xml with dependencies**

Create: `pom.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.1</version>
        <relativePath/>
    </parent>

    <groupId>com.spotease</groupId>
    <artifactId>spotease-backend</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>spotease-backend</name>
    <description>Spotify and NetEase playlist converter backend</description>

    <properties>
        <java.version>17</java.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-websocket</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>

        <!-- Database -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Utilities -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

**Step 3: Create main application class**

Create: `src/main/java/com/spotease/SpoteaseApplication.java`
```java
package com.spotease;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SpoteaseApplication {
    public static void main(String[] args) {
        SpringApplication.run(SpoteaseApplication.class, args);
    }
}
```

**Step 4: Create application.properties**

Create: `src/main/resources/application.properties`
```properties
# Application
spring.application.name=spotease-backend
server.port=8080

# Database (will be configured later)
spring.datasource.url=jdbc:postgresql://localhost:5432/spotease
spring.datasource.username=postgres
spring.datasource.password=postgres

# JPA
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# Encryption (placeholder - should be in env var)
spotease.encryption.key=changeme32characterlongsecretkey

# Spotify OAuth (placeholder)
spotease.spotify.client-id=${SPOTIFY_CLIENT_ID:changeme}
spotease.spotify.client-secret=${SPOTIFY_CLIENT_SECRET:changeme}
spotease.spotify.redirect-uri=http://localhost:8080/api/auth/spotify/callback
```

**Step 5: Create .gitignore**

Create: `.gitignore`
```
target/
!.mvn/wrapper/maven-wrapper.jar
!**/src/main/**/target/
!**/src/test/**/target/

### IntelliJ IDEA ###
.idea
*.iws
*.iml
*.ipr

### Eclipse ###
.apt_generated
.classpath
.factorypath
.project
.settings
.springBeans
.sts4-cache

### VS Code ###
.vscode/

### Mac ###
.DS_Store

### Application ###
application-local.properties
```

**Step 6: Download dependencies**

Run: `mvn clean install`
Expected: BUILD SUCCESS

**Step 7: Verify application starts**

Run: `mvn spring-boot:run`
Expected: Application starts on port 8080 (will fail to connect to database - that's OK for now)

**Step 8: Commit project initialization**

```bash
git add pom.xml src/ .gitignore
git commit -m "feat: initialize Spring Boot project with dependencies"
```

---

## Task 2: Create Package Structure

**Files:**
- Create: `src/main/java/com/spotease/config/.gitkeep`
- Create: `src/main/java/com/spotease/controller/.gitkeep`
- Create: `src/main/java/com/spotease/service/.gitkeep`
- Create: `src/main/java/com/spotease/worker/.gitkeep`
- Create: `src/main/java/com/spotease/model/.gitkeep`
- Create: `src/main/java/com/spotease/repository/.gitkeep`
- Create: `src/main/java/com/spotease/dto/.gitkeep`
- Create: `src/main/java/com/spotease/util/.gitkeep`

**Step 1: Create all package directories**

Run:
```bash
mkdir -p src/main/java/com/spotease/config
mkdir -p src/main/java/com/spotease/controller
mkdir -p src/main/java/com/spotease/service
mkdir -p src/main/java/com/spotease/worker
mkdir -p src/main/java/com/spotease/model
mkdir -p src/main/java/com/spotease/repository
mkdir -p src/main/java/com/spotease/dto
mkdir -p src/main/java/com/spotease/util
touch src/main/java/com/spotease/config/.gitkeep
touch src/main/java/com/spotease/controller/.gitkeep
touch src/main/java/com/spotease/service/.gitkeep
touch src/main/java/com/spotease/worker/.gitkeep
touch src/main/java/com/spotease/model/.gitkeep
touch src/main/java/com/spotease/repository/.gitkeep
touch src/main/java/com/spotease/dto/.gitkeep
touch src/main/java/com/spotease/util/.gitkeep
```

**Step 2: Commit package structure**

```bash
git add src/main/java/com/spotease/
git commit -m "feat: create package structure"
```

---

## Task 3: Create Enum Classes

**Files:**
- Create: `src/main/java/com/spotease/model/Platform.java`
- Create: `src/main/java/com/spotease/model/ConversionMode.java`
- Create: `src/main/java/com/spotease/model/JobStatus.java`
- Create: `src/main/java/com/spotease/model/MatchStatus.java`

**Step 1: Create Platform enum**

Create: `src/main/java/com/spotease/model/Platform.java`
```java
package com.spotease.model;

public enum Platform {
    SPOTIFY,
    NETEASE
}
```

**Step 2: Create ConversionMode enum**

Create: `src/main/java/com/spotease/model/ConversionMode.java`
```java
package com.spotease.model;

public enum ConversionMode {
    CREATE,
    UPDATE
}
```

**Step 3: Create JobStatus enum**

Create: `src/main/java/com/spotease/model/JobStatus.java`
```java
package com.spotease.model;

public enum JobStatus {
    QUEUED,
    PROCESSING,
    REVIEW_PENDING,
    COMPLETED,
    FAILED
}
```

**Step 4: Create MatchStatus enum**

Create: `src/main/java/com/spotease/model/MatchStatus.java`
```java
package com.spotease.model;

public enum MatchStatus {
    AUTO_MATCHED,
    PENDING_REVIEW,
    USER_APPROVED,
    USER_SKIPPED,
    FAILED
}
```

**Step 5: Commit enums**

```bash
git add src/main/java/com/spotease/model/*.java
git commit -m "feat: create enum types for Platform, Mode, and Status"
```

---

## Task 4: Create User Entity

**Files:**
- Create: `src/main/java/com/spotease/model/User.java`

**Step 1: Create User entity class**

Create: `src/main/java/com/spotease/model/User.java`
```java
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
```

**Step 2: Enable JPA auditing**

Modify: `src/main/java/com/spotease/SpoteaseApplication.java`
```java
package com.spotease;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class SpoteaseApplication {
    public static void main(String[] args) {
        SpringApplication.run(SpoteaseApplication.class, args);
    }
}
```

**Step 3: Commit User entity**

```bash
git add src/main/java/com/spotease/model/User.java src/main/java/com/spotease/SpoteaseApplication.java
git commit -m "feat: create User entity with Spotify and NetEase fields"
```

---

## Task 5: Create ConversionJob Entity

**Files:**
- Create: `src/main/java/com/spotease/model/ConversionJob.java`

**Step 1: Create ConversionJob entity**

Create: `src/main/java/com/spotease/model/ConversionJob.java`
```java
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
```

**Step 2: Commit ConversionJob entity**

```bash
git add src/main/java/com/spotease/model/ConversionJob.java
git commit -m "feat: create ConversionJob entity with progress tracking"
```

---

## Task 6: Create TrackMatch Entity

**Files:**
- Create: `src/main/java/com/spotease/model/TrackMatch.java`

**Step 1: Create TrackMatch entity**

Create: `src/main/java/com/spotease/model/TrackMatch.java`
```java
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

    // Destination track info
    private String destinationTrackId;
    private String destinationTrackName;
    private String destinationArtist;

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
```

**Step 2: Commit TrackMatch entity**

```bash
git add src/main/java/com/spotease/model/TrackMatch.java
git commit -m "feat: create TrackMatch entity with match confidence scoring"
```

---

## Task 7: Create Spring Data JPA Repositories

**Files:**
- Create: `src/main/java/com/spotease/repository/UserRepository.java`
- Create: `src/main/java/com/spotease/repository/ConversionJobRepository.java`
- Create: `src/main/java/com/spotease/repository/TrackMatchRepository.java`

**Step 1: Create UserRepository**

Create: `src/main/java/com/spotease/repository/UserRepository.java`
```java
package com.spotease.repository;

import com.spotease.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findBySpotifyUserId(String spotifyUserId);
    Optional<User> findByEmail(String email);
}
```

**Step 2: Create ConversionJobRepository**

Create: `src/main/java/com/spotease/repository/ConversionJobRepository.java`
```java
package com.spotease.repository;

import com.spotease.model.ConversionJob;
import com.spotease.model.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversionJobRepository extends JpaRepository<ConversionJob, Long> {
    List<ConversionJob> findByUserId(Long userId);
    List<ConversionJob> findByUserIdAndStatus(Long userId, JobStatus status);
}
```

**Step 3: Create TrackMatchRepository**

Create: `src/main/java/com/spotease/repository/TrackMatchRepository.java`
```java
package com.spotease.repository;

import com.spotease.model.MatchStatus;
import com.spotease.model.TrackMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrackMatchRepository extends JpaRepository<TrackMatch, Long> {
    List<TrackMatch> findByConversionJobId(Long conversionJobId);
    List<TrackMatch> findByConversionJobIdAndStatus(Long conversionJobId, MatchStatus status);
}
```

**Step 4: Commit repositories**

```bash
git add src/main/java/com/spotease/repository/
git commit -m "feat: create Spring Data JPA repositories"
```

---

## Task 8: Set Up PostgreSQL Database

**Files:**
- Modify: `src/main/resources/application.properties` (already configured)

**Step 1: Create PostgreSQL database**

Run:
```bash
# Using psql or your preferred PostgreSQL client
psql -U postgres -c "CREATE DATABASE spotease;"
```

Expected: `CREATE DATABASE`

**Step 2: Verify application can connect and create tables**

Run: `mvn spring-boot:run`

Expected: Application starts successfully and Hibernate creates tables

**Step 3: Verify tables exist**

Run:
```bash
psql -U postgres -d spotease -c "\dt"
```

Expected: Lists tables: `users`, `conversion_jobs`, `track_matches`

**Step 4: Stop application**

Press Ctrl+C

---

## Task 9: Create TokenEncryption Utility

**Files:**
- Create: `src/main/java/com/spotease/util/TokenEncryption.java`
- Create: `src/test/java/com/spotease/util/TokenEncryptionTest.java`

**Step 1: Write failing test**

Create: `src/test/java/com/spotease/util/TokenEncryptionTest.java`
```java
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
}
```

**Step 2: Run test to verify it fails**

Run: `mvn test -Dtest=TokenEncryptionTest`
Expected: FAIL - `TokenEncryption class not found`

**Step 3: Implement TokenEncryption**

Create: `src/main/java/com/spotease/util/TokenEncryption.java`
```java
package com.spotease.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
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
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes());

            // Prepend IV to ciphertext
            byte[] combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String ciphertext) {
        try {
            byte[] combined = Base64.getDecoder().decode(ciphertext);

            // Extract IV and ciphertext
            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] encryptedData = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, iv.length);
            System.arraycopy(combined, iv.length, encryptedData, 0, encryptedData.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            byte[] plaintext = cipher.doFinal(encryptedData);
            return new String(plaintext);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
```

**Step 4: Run test to verify it passes**

Run: `mvn test -Dtest=TokenEncryptionTest`
Expected: All tests PASS

**Step 5: Commit TokenEncryption**

```bash
git add src/main/java/com/spotease/util/TokenEncryption.java src/test/java/com/spotease/util/TokenEncryptionTest.java
git commit -m "feat: implement AES-256-GCM token encryption utility"
```

---

## Task 10: Configure Spring Security

**Files:**
- Create: `src/main/java/com/spotease/config/SecurityConfig.java`

**Step 1: Create SecurityConfig**

Create: `src/main/java/com/spotease/config/SecurityConfig.java`
```java
package com.spotease.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable()) // Disable for now, enable later with proper config
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable());

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173", "http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

**Step 2: Verify application starts with security config**

Run: `mvn spring-boot:run`
Expected: Application starts successfully

**Step 3: Commit SecurityConfig**

```bash
git add src/main/java/com/spotease/config/SecurityConfig.java
git commit -m "feat: configure Spring Security with CORS and auth rules"
```

---

## Task 11: Configure Async Executor

**Files:**
- Create: `src/main/java/com/spotease/config/AsyncConfig.java`

**Step 1: Create AsyncConfig**

Create: `src/main/java/com/spotease/config/AsyncConfig.java`
```java
package com.spotease.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("conversion-worker-");
        executor.initialize();
        return executor;
    }
}
```

**Step 2: Commit AsyncConfig**

```bash
git add src/main/java/com/spotease/config/AsyncConfig.java
git commit -m "feat: configure async executor for background jobs"
```

---

## Task 12: Create Spotify DTOs

**Files:**
- Create: `src/main/java/com/spotease/dto/spotify/SpotifyUserProfile.java`
- Create: `src/main/java/com/spotease/dto/spotify/SpotifyTokenResponse.java`
- Create: `src/main/java/com/spotease/dto/spotify/SpotifyPlaylist.java`
- Create: `src/main/java/com/spotease/dto/spotify/SpotifyTrack.java`

**Step 1: Create SpotifyTokenResponse**

Create: `src/main/java/com/spotease/dto/spotify/SpotifyTokenResponse.java`
```java
package com.spotease.dto.spotify;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class SpotifyTokenResponse {
    @JsonProperty("access_token")
    private String accessToken;

    @JsonProperty("token_type")
    private String tokenType;

    @JsonProperty("expires_in")
    private Integer expiresIn;

    @JsonProperty("refresh_token")
    private String refreshToken;

    private String scope;
}
```

**Step 2: Create SpotifyUserProfile**

Create: `src/main/java/com/spotease/dto/spotify/SpotifyUserProfile.java`
```java
package com.spotease.dto.spotify;

import lombok.Data;

@Data
public class SpotifyUserProfile {
    private String id;
    private String email;
    private String displayName;
}
```

**Step 3: Create SpotifyPlaylist**

Create: `src/main/java/com/spotease/dto/spotify/SpotifyPlaylist.java`
```java
package com.spotease.dto.spotify;

import lombok.Data;

@Data
public class SpotifyPlaylist {
    private String id;
    private String name;
    private String description;
    private Integer totalTracks;
}
```

**Step 4: Create SpotifyTrack**

Create: `src/main/java/com/spotease/dto/spotify/SpotifyTrack.java`
```java
package com.spotease.dto.spotify;

import lombok.Data;

import java.util.List;

@Data
public class SpotifyTrack {
    private String id;
    private String name;
    private List<String> artists;
    private String album;
    private Integer durationMs;
    private String isrc;
}
```

**Step 5: Commit Spotify DTOs**

```bash
git add src/main/java/com/spotease/dto/spotify/
git commit -m "feat: create Spotify API response DTOs"
```

---

## Task 13: Create AuthController with Spotify OAuth Endpoints

**Files:**
- Create: `src/main/java/com/spotease/controller/AuthController.java`
- Create: `src/main/java/com/spotease/service/AuthService.java`

**Step 1: Create AuthService**

Create: `src/main/java/com/spotease/service/AuthService.java`
```java
package com.spotease.service;

import com.spotease.dto.spotify.SpotifyTokenResponse;
import com.spotease.dto.spotify.SpotifyUserProfile;
import com.spotease.model.User;
import com.spotease.repository.UserRepository;
import com.spotease.util.TokenEncryption;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final TokenEncryption tokenEncryption;
    private final WebClient.Builder webClientBuilder;

    @Value("${spotease.spotify.client-id}")
    private String spotifyClientId;

    @Value("${spotease.spotify.client-secret}")
    private String spotifyClientSecret;

    @Value("${spotease.spotify.redirect-uri}")
    private String spotifyRedirectUri;

    public String getSpotifyAuthUrl(String state) {
        String scope = "user-read-email playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private";
        return "https://accounts.spotify.com/authorize" +
                "?client_id=" + spotifyClientId +
                "&response_type=code" +
                "&redirect_uri=" + spotifyRedirectUri +
                "&scope=" + scope +
                "&state=" + state;
    }

    public User handleSpotifyCallback(String code) {
        // Exchange code for tokens
        SpotifyTokenResponse tokenResponse = exchangeCodeForToken(code);

        // Get user profile
        SpotifyUserProfile profile = getSpotifyUserProfile(tokenResponse.getAccessToken());

        // Create or update user
        User user = userRepository.findBySpotifyUserId(profile.getId())
                .orElse(new User());

        user.setSpotifyUserId(profile.getId());
        user.setEmail(profile.getEmail());
        user.setSpotifyAccessToken(tokenEncryption.encrypt(tokenResponse.getAccessToken()));
        user.setSpotifyRefreshToken(tokenEncryption.encrypt(tokenResponse.getRefreshToken()));
        user.setSpotifyTokenExpiry(LocalDateTime.now().plusSeconds(tokenResponse.getExpiresIn()));

        return userRepository.save(user);
    }

    private SpotifyTokenResponse exchangeCodeForToken(String code) {
        WebClient webClient = webClientBuilder.baseUrl("https://accounts.spotify.com").build();

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "authorization_code");
        formData.add("code", code);
        formData.add("redirect_uri", spotifyRedirectUri);
        formData.add("client_id", spotifyClientId);
        formData.add("client_secret", spotifyClientSecret);

        return webClient.post()
                .uri("/api/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .bodyToMono(SpotifyTokenResponse.class)
                .block();
    }

    private SpotifyUserProfile getSpotifyUserProfile(String accessToken) {
        WebClient webClient = webClientBuilder.baseUrl("https://api.spotify.com").build();

        return webClient.get()
                .uri("/v1/me")
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .bodyToMono(SpotifyUserProfile.class)
                .block();
    }
}
```

**Step 2: Create AuthController**

Create: `src/main/java/com/spotease/controller/AuthController.java`
```java
package com.spotease.controller;

import com.spotease.model.User;
import com.spotease.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @GetMapping("/spotify/login")
    public ResponseEntity<?> spotifyLogin(HttpSession session) {
        String state = UUID.randomUUID().toString();
        session.setAttribute("spotify_oauth_state", state);

        String authUrl = authService.getSpotifyAuthUrl(state);
        return ResponseEntity.ok(Map.of("authUrl", authUrl));
    }

    @GetMapping("/spotify/callback")
    public ResponseEntity<?> spotifyCallback(
            @RequestParam String code,
            @RequestParam String state,
            HttpSession session) {

        // Validate state
        String sessionState = (String) session.getAttribute("spotify_oauth_state");
        if (sessionState == null || !sessionState.equals(state)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid state parameter"));
        }

        // Handle OAuth callback
        User user = authService.handleSpotifyCallback(code);

        // Store user in session
        session.setAttribute("userId", user.getId());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "userId", user.getId(),
                "email", user.getEmail()
        ));
    }

    @GetMapping("/status")
    public ResponseEntity<?> getAuthStatus(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");

        if (userId == null) {
            return ResponseEntity.ok(Map.of(
                    "authenticated", false,
                    "spotifyConnected", false,
                    "neteaseConnected", false
            ));
        }

        // In real implementation, fetch user and check token validity
        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "userId", userId,
                "spotifyConnected", true,
                "neteaseConnected", false
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("success", true));
    }
}
```

**Step 3: Configure WebClient Bean**

Modify: `src/main/java/com/spotease/config/SecurityConfig.java` (add at end)
```java
import org.springframework.context.annotation.Bean;
import org.springframework.web.reactive.function.client.WebClient;

// Add inside SecurityConfig class:

@Bean
public WebClient.Builder webClientBuilder() {
    return WebClient.builder();
}
```

**Step 4: Test Spotify OAuth flow manually**

Run: `mvn spring-boot:run`

Test:
1. Visit http://localhost:8080/api/auth/spotify/login
2. Should return JSON with authUrl
3. Visit authUrl in browser (won't work without real Spotify credentials)

**Step 5: Commit Spotify OAuth implementation**

```bash
git add src/main/java/com/spotease/controller/AuthController.java src/main/java/com/spotease/service/AuthService.java src/main/java/com/spotease/config/SecurityConfig.java
git commit -m "feat: implement Spotify OAuth authentication flow"
```

---

## Task 14: Create SpotifyService

**Files:**
- Create: `src/main/java/com/spotease/service/SpotifyService.java`

**Step 1: Create SpotifyService**

Create: `src/main/java/com/spotease/service/SpotifyService.java`
```java
package com.spotease.service;

import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.dto.spotify.SpotifyTrack;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SpotifyService {

    private final WebClient.Builder webClientBuilder;

    private WebClient getWebClient() {
        return webClientBuilder
                .baseUrl("https://api.spotify.com/v1")
                .build();
    }

    public List<SpotifyPlaylist> getPlaylists(String accessToken) {
        return getWebClient()
                .get()
                .uri("/me/playlists?limit=50")
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .bodyToFlux(SpotifyPlaylist.class)
                .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
                .collectList()
                .block();
    }

    public List<SpotifyTrack> getPlaylistTracks(String accessToken, String playlistId) {
        return getWebClient()
                .get()
                .uri("/playlists/" + playlistId + "/tracks")
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .bodyToFlux(SpotifyTrack.class)
                .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
                .collectList()
                .block();
    }

    public List<SpotifyTrack> searchTrack(String accessToken, String query) {
        return getWebClient()
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search")
                        .queryParam("q", query)
                        .queryParam("type", "track")
                        .queryParam("limit", 10)
                        .build())
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .bodyToFlux(SpotifyTrack.class)
                .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
                .collectList()
                .block();
    }

    public void addTracksToPlaylist(String accessToken, String playlistId, List<String> trackUris) {
        getWebClient()
                .post()
                .uri("/playlists/" + playlistId + "/tracks")
                .header("Authorization", "Bearer " + accessToken)
                .bodyValue(trackUris)
                .retrieve()
                .bodyToMono(Void.class)
                .block();
    }
}
```

**Step 2: Commit SpotifyService**

```bash
git add src/main/java/com/spotease/service/SpotifyService.java
git commit -m "feat: implement SpotifyService with WebClient"
```

---

## Task 15: Create NetEase DTOs and Service (Stub)

**Files:**
- Create: `src/main/java/com/spotease/dto/netease/NeteasePlaylist.java`
- Create: `src/main/java/com/spotease/dto/netease/NeteaseTrack.java`
- Create: `src/main/java/com/spotease/service/NeteaseService.java`

**Step 1: Create NeteasePlaylist DTO**

Create: `src/main/java/com/spotease/dto/netease/NeteasePlaylist.java`
```java
package com.spotease.dto.netease;

import lombok.Data;

@Data
public class NeteasePlaylist {
    private String id;
    private String name;
    private String description;
    private Integer trackCount;
}
```

**Step 2: Create NeteaseTrack DTO**

Create: `src/main/java/com/spotease/dto/netease/NeteaseTrack.java`
```java
package com.spotease.dto.netease;

import lombok.Data;

import java.util.List;

@Data
public class NeteaseTrack {
    private String id;
    private String name;
    private List<String> artists;
    private String album;
    private Integer duration;
}
```

**Step 3: Create NeteaseService stub**

Create: `src/main/java/com/spotease/service/NeteaseService.java`
```java
package com.spotease.service;

import com.spotease.dto.netease.NeteasePlaylist;
import com.spotease.dto.netease.NeteaseTrack;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NeteaseService {

    private final WebClient.Builder webClientBuilder;

    // TODO: Configure actual NetEase API base URL based on community framework
    private WebClient getWebClient() {
        return webClientBuilder
                .baseUrl("https://netease-cloud-music-api-placeholder.com")
                .build();
    }

    public List<NeteasePlaylist> getPlaylists(String cookie) {
        // TODO: Implement using NetEase community API
        throw new UnsupportedOperationException("NetEase integration not yet implemented");
    }

    public List<NeteaseTrack> getPlaylistTracks(String cookie, String playlistId) {
        // TODO: Implement using NetEase community API
        throw new UnsupportedOperationException("NetEase integration not yet implemented");
    }

    public List<NeteaseTrack> searchTrack(String cookie, String query) {
        // TODO: Implement using NetEase community API
        throw new UnsupportedOperationException("NetEase integration not yet implemented");
    }

    public void addTracksToPlaylist(String cookie, String playlistId, List<String> trackIds) {
        // TODO: Implement using NetEase community API
        throw new UnsupportedOperationException("NetEase integration not yet implemented");
    }
}
```

**Step 4: Commit NetEase stubs**

```bash
git add src/main/java/com/spotease/dto/netease/ src/main/java/com/spotease/service/NeteaseService.java
git commit -m "feat: create NetEase DTOs and service stub"
```

---

## Task 16: Add NetEase QR Auth Endpoints (Stub)

**Files:**
- Modify: `src/main/java/com/spotease/controller/AuthController.java`

**Step 1: Add NetEase QR endpoints to AuthController**

Modify: `src/main/java/com/spotease/controller/AuthController.java` (add at end of class)
```java
@PostMapping("/netease/qr")
public ResponseEntity<?> generateNeteaseQR() {
    // TODO: Implement NetEase QR code generation
    return ResponseEntity.ok(Map.of(
            "message", "NetEase QR authentication not yet implemented",
            "qrKey", "placeholder-key",
            "qrImage", "data:image/png;base64,..."
    ));
}

@GetMapping("/netease/qr/status")
public ResponseEntity<?> checkNeteaseQRStatus(@RequestParam String key) {
    // TODO: Implement NetEase QR status polling
    return ResponseEntity.ok(Map.of(
            "status", "PENDING",
            "message", "NetEase QR authentication not yet implemented"
    ));
}
```

**Step 2: Commit NetEase QR stubs**

```bash
git add src/main/java/com/spotease/controller/AuthController.java
git commit -m "feat: add NetEase QR auth endpoint stubs"
```

---

## Task 17: Create Health Check Endpoint

**Files:**
- Create: `src/main/java/com/spotease/controller/HealthController.java`

**Step 1: Create HealthController**

Create: `src/main/java/com/spotease/controller/HealthController.java`
```java
package com.spotease.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "timestamp", LocalDateTime.now(),
                "service", "spotease-backend"
        ));
    }
}
```

**Step 2: Test health endpoint**

Run: `mvn spring-boot:run`

Test:
```bash
curl http://localhost:8080/api/health
```

Expected: `{"status":"UP","timestamp":"...","service":"spotease-backend"}`

**Step 3: Commit health check**

```bash
git add src/main/java/com/spotease/controller/HealthController.java
git commit -m "feat: add health check endpoint"
```

---

## Task 18: Create README for Backend

**Files:**
- Create: `README.md`

**Step 1: Create README**

Create: `README.md`
```markdown
# Spotease Backend

Spring Boot backend for Spotease - Spotify and NetEase Music playlist converter.

## Tech Stack

- Spring Boot 3.2+
- Spring Data JPA
- Spring Security
- Spring WebSocket
- PostgreSQL
- Lombok

## Prerequisites

- Java 17+
- Maven 3.8+
- PostgreSQL 14+

## Setup

1. **Create PostgreSQL database:**
```bash
psql -U postgres -c "CREATE DATABASE spotease;"
```

2. **Configure environment variables:**
```bash
export SPOTIFY_CLIENT_ID=your_spotify_client_id
export SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

3. **Update application.properties:**
- Set `spotease.encryption.key` to a secure 32-character string
- Update database credentials if needed

4. **Run the application:**
```bash
mvn spring-boot:run
```

Application will start on http://localhost:8080

## API Endpoints

### Authentication
- `GET /api/auth/spotify/login` - Get Spotify OAuth URL
- `GET /api/auth/spotify/callback` - Spotify OAuth callback
- `POST /api/auth/netease/qr` - Generate NetEase QR code (stub)
- `GET /api/auth/netease/qr/status` - Check QR scan status (stub)
- `GET /api/auth/status` - Get authentication status
- `POST /api/auth/logout` - Logout

### Health
- `GET /api/health` - Health check endpoint

## Project Structure

```
src/main/java/com/spotease/
├── config/          # Configuration classes
├── controller/      # REST controllers
├── service/         # Business logic
├── worker/          # Async workers
├── model/           # JPA entities
├── repository/      # Spring Data repositories
├── dto/             # Data transfer objects
└── util/            # Utility classes
```

## Development

### Running Tests
```bash
mvn test
```

### Building
```bash
mvn clean package
```

### Database Migrations

This project uses Hibernate auto-DDL (development only). For production, consider using Flyway or Liquibase.

## Status

**Implemented:**
- ✅ Project structure and dependencies
- ✅ JPA entities (User, ConversionJob, TrackMatch)
- ✅ Spring Data repositories
- ✅ Token encryption utility
- ✅ Spring Security configuration
- ✅ Async executor configuration
- ✅ Spotify OAuth authentication
- ✅ SpotifyService for API calls

**TODO:**
- ⏳ NetEase QR authentication implementation
- ⏳ NeteaseService implementation
- ⏳ Playlist endpoints
- ⏳ Conversion job endpoints
- ⏳ Track matching service
- ⏳ Background worker implementation
- ⏳ WebSocket configuration
- ⏳ Review endpoints

## License

MIT
```

**Step 2: Commit README**

```bash
git add README.md
git commit -m "docs: add backend README with setup instructions"
```

---

## Final Checklist

Before considering this phase complete, verify:

- [ ] Application starts without errors: `mvn spring-boot:run`
- [ ] Database tables are created: `users`, `conversion_jobs`, `track_matches`
- [ ] Health endpoint responds: `curl http://localhost:8080/api/health`
- [ ] Spotify OAuth login endpoint returns authUrl: `curl http://localhost:8080/api/auth/spotify/login`
- [ ] All tests pass: `mvn test`
- [ ] Code is committed with clear commit messages
- [ ] README documents current state

---

## Next Steps

After completing this plan, the next phase should focus on:

1. **NetEase Integration** - Implement actual NetEase QR authentication and API calls
2. **Playlist Endpoints** - Create controllers for fetching playlists from both platforms
3. **Conversion Logic** - Implement ConversionService and ConversionWorker
4. **Track Matching** - Implement MatchingService with confidence scoring
5. **WebSocket** - Configure WebSocket for real-time updates
6. **Review Endpoints** - Implement endpoints for reviewing uncertain matches

---

**Plan saved to:** `docs/plans/2025-12-27-spring-boot-backend-foundation.md`
