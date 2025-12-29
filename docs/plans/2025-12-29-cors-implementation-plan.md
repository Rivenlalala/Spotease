# Production-Level CORS Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement production-level CORS configuration with profile-based origin whitelisting and session cookie support

**Architecture:** Profile-based Spring Security CORS with explicit origin whitelisting, hardcoded security settings in Java, and environment-specific origins in YAML

**Tech Stack:** Spring Boot 3.x, Spring Security, YAML configuration, session-based authentication

**Related Design:** See `docs/plans/2025-12-29-cors-configuration-design.md` for full design rationale

---

## Task 1: Update application.yml with Production CORS Config

**Files:**
- Modify: `spotease-backend/src/main/resources/application.yml:16-31`

**Step 1: Add session cookie configuration to application.yml**

After line 17 (`port: 8080`), add the session cookie configuration:

```yaml
server:
  port: 8080
  servlet:
    session:
      cookie:
        same-site: lax
        secure: true
        http-only: true
        domain: .rivenlalala.xyz
```

**Explanation:**
- `same-site: lax` - Allows OAuth redirects while preventing CSRF
- `secure: true` - Cookies only sent over HTTPS in production
- `http-only: true` - JavaScript cannot access (XSS protection)
- `domain: .rivenlalala.xyz` - Cookie shared across subdomains

**Step 2: Update CORS allowed-origins to production URL**

Replace line 31:
```yaml
# OLD
allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}

# NEW
allowed-origins: ${CORS_ALLOWED_ORIGINS:https://spotease.rivenlalala.xyz}
```

**Explanation:**
- Changes default from localhost to production domain
- Still allows override via CORS_ALLOWED_ORIGINS environment variable
- Uses explicit HTTPS for production security

**Step 3: Verify YAML syntax**

Run:
```bash
cd spotease-backend
mvn validate
```

**Expected:** Build success, no YAML parsing errors

**Step 4: Commit the changes**

```bash
git add spotease-backend/src/main/resources/application.yml
git commit -m "config: add production session cookie and CORS settings

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update application-dev.yml with Development Cookie Config

**Files:**
- Modify: `spotease-backend/src/main/resources/application-dev.yml:10-13`

**Step 1: Add server.servlet.session section after line 9**

After the `show-sql: true` line, add:

```yaml
server:
  servlet:
    session:
      cookie:
        secure: false  # Allow HTTP in development
        # domain omitted - doesn't work with 127.0.0.1
```

**Explanation:**
- `secure: false` - Critical for local HTTP development
- No `domain` setting - default behavior works with 127.0.0.1
- Overrides production secure: true setting

**Step 2: Verify existing CORS config**

Confirm these lines exist at the end of the file (should already be there):

```yaml
# CORS for local frontend
cors:
  allowed-origins: http://127.0.0.1:5173
```

**Expected:** These lines should already exist (no changes needed)

**Step 3: Verify YAML syntax**

Run:
```bash
cd spotease-backend
mvn validate
```

**Expected:** Build success, no YAML parsing errors

**Step 4: Commit the changes**

```bash
git add spotease-backend/src/main/resources/application-dev.yml
git commit -m "config: add development session cookie settings

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add CORS Configuration Bean to SecurityConfig.java

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/config/SecurityConfig.java:1-45`

**Step 1: Add required imports**

After line 2 (after `package com.spotease.config;`), update the imports section:

```java
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
```

**Explanation:**
- `@Value` - Inject CORS origins from YAML
- `Customizer` - Enable CORS with default configuration
- `CorsConfiguration` - Configure CORS settings
- `CorsConfigurationSource` - Spring Security CORS interface
- `UrlBasedCorsConfigurationSource` - URL pattern-based CORS config

**Step 2: Add @Value field after class declaration**

After line 15 (`public class SecurityConfig {`), add:

```java
    @Value("${cors.allowed-origins}")
    private String allowedOrigins;
```

**Explanation:**
- Injects `cors.allowed-origins` from application.yml
- Supports comma-separated list of origins
- Fails fast if property is missing

**Step 3: Add CorsConfigurationSource bean before securityFilterChain**

After the `allowedOrigins` field, add the complete CORS configuration bean:

```java
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Parse comma-separated origins from YAML
        configuration.setAllowedOrigins(
            Arrays.asList(allowedOrigins.split(","))
        );

        // Hardcoded security settings (never change per environment)
        configuration.setAllowedMethods(
            Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        );
        configuration.setAllowedHeaders(
            Arrays.asList("Content-Type", "Authorization", "Accept", "X-Requested-With")
        );
        configuration.setExposedHeaders(
            Arrays.asList("Set-Cookie")
        );
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
```

**Explanation:**
- **setAllowedOrigins** - Splits comma-separated string into list
- **setAllowedMethods** - Explicit HTTP methods (no wildcards with credentials)
- **setAllowedHeaders** - Required headers (no wildcards with credentials)
- **setExposedHeaders** - Allow frontend to see Set-Cookie header
- **setAllowCredentials(true)** - CRITICAL for session cookies
- **setMaxAge(3600L)** - Cache preflight responses for 1 hour
- **registerCorsConfiguration("/**")** - Apply to all endpoints

**Step 4: Verify code compiles**

Run:
```bash
cd spotease-backend
mvn compile
```

**Expected:** Build success, no compilation errors

**Step 5: Commit the changes**

```bash
git add spotease-backend/src/main/java/com/spotease/config/SecurityConfig.java
git commit -m "feat: add CORS configuration bean with origin whitelisting

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Enable CORS in SecurityFilterChain

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/config/SecurityConfig.java:18-21`

**Step 1: Replace cors.disable() with Customizer.withDefaults()**

Find line 20 (`.cors(cors -> cors.disable())`) and replace with:

```java
.cors(Customizer.withDefaults())
```

**Explanation:**
- Removes complete CORS bypass (insecure)
- Enables CORS with the CorsConfigurationSource bean we created
- Spring Security auto-detects the bean by name
- Applies CORS filters before other security filters

**Step 2: Verify code compiles**

Run:
```bash
cd spotease-backend
mvn compile
```

**Expected:** Build success, no compilation errors

**Step 3: Test backend starts successfully**

Run:
```bash
cd spotease-backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Expected output:**
```
The following profiles are active: dev
Creating shared instance of singleton bean 'corsConfigurationSource'
Started SpoteaseBackendApplication in X.XXX seconds
```

**Step 4: Verify CORS headers are present (keep backend running)**

In a new terminal, test CORS preflight:

```bash
curl -X OPTIONS http://127.0.0.1:8080/api/health \
  -H "Origin: http://127.0.0.1:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep -i "access-control"
```

**Expected output:**
```
< Access-Control-Allow-Origin: http://127.0.0.1:5173
< Access-Control-Allow-Credentials: true
< Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
< Access-Control-Max-Age: 3600
```

**Step 5: Stop the backend (Ctrl+C)**

**Step 6: Commit the changes**

```bash
git add spotease-backend/src/main/java/com/spotease/config/SecurityConfig.java
git commit -m "feat: enable CORS in security filter chain

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Verify CORS Rejects Unauthorized Origins

**Files:**
- No file changes (verification only)

**Step 1: Start backend with dev profile**

```bash
cd spotease-backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Expected:** Backend starts successfully

**Step 2: Test authorized origin (should work)**

In a new terminal:

```bash
curl -X OPTIONS http://127.0.0.1:8080/api/health \
  -H "Origin: http://127.0.0.1:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep -i "access-control-allow-origin"
```

**Expected output:**
```
< Access-Control-Allow-Origin: http://127.0.0.1:5173
```

**Step 3: Test unauthorized origin (should be rejected)**

```bash
curl -X OPTIONS http://127.0.0.1:8080/api/health \
  -H "Origin: http://malicious-site.com" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep -i "access-control"
```

**Expected output:** Empty (no CORS headers)

**Explanation:** Browser would block this request

**Step 4: Test localhost vs 127.0.0.1 (should be rejected)**

```bash
curl -X OPTIONS http://127.0.0.1:8080/api/health \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep -i "access-control-allow-origin"
```

**Expected output:** Empty (no CORS headers)

**Explanation:** `localhost` and `127.0.0.1` are different origins in CORS

**Step 5: Stop the backend (Ctrl+C)**

**No commit needed (verification only)**

---

## Task 6: Update Docker Compose CORS Environment Variable

**Files:**
- Modify: `docker-compose.yml:40-48`

**Step 1: Verify SPRING_PROFILES_ACTIVE is set**

Check line 40 - should say:
```yaml
SPRING_PROFILES_ACTIVE: production
```

**Expected:** Already configured (no changes needed)

**Step 2: Update CORS environment variable reference**

The current line 48 says:
```yaml
CORS_ALLOWED_ORIGINS: ${FRONTEND_URL}
```

**Keep this as-is** - It references the FRONTEND_URL environment variable from .env file.

**Explanation:**
- Docker Compose will read FRONTEND_URL from .env
- This will be passed to Spring Boot as CORS_ALLOWED_ORIGINS
- Spring Boot will use this to override the YAML default

**Step 3: Verify .env.example or create documentation**

Check if `.env.example` exists:

```bash
ls -la .env.example
```

**If it doesn't exist**, create it:

```bash
cat > .env.example << 'EOF'
# Database
DB_USER=spotease_user
DB_PASSWORD=change_me_in_production

# Application Security
ENCRYPTION_KEY=change_me_32_character_string

# Spotify OAuth
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://api.spotease.rivenlalala.xyz/api/auth/spotify/callback

# NetEase API
NETEASE_API_URL=https://netease-api.rivenlalala.xyz

# Frontend URL (used for CORS)
FRONTEND_URL=https://spotease.rivenlalala.xyz

# Environment
ENVIRONMENT=production
EOF
```

**Step 4: Commit any new files**

```bash
git add .env.example 2>/dev/null || true
if git diff --cached --quiet; then
  echo "No changes to commit"
else
  git commit -m "docs: add .env.example with CORS configuration

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
fi
```

---

## Task 7: Integration Test with Local Environment

**Files:**
- No file changes (integration test only)

**Step 1: Start PostgreSQL**

```bash
docker-compose -f docker-compose.dev.yml up -d 2>/dev/null || docker run -d \
  --name spotease-postgres-test \
  -e POSTGRES_DB=spotease \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15-alpine
```

**Expected:** PostgreSQL container running

**Step 2: Start backend with dev profile**

```bash
cd spotease-backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Expected logs:**
```
The following profiles are active: dev
Creating shared instance of singleton bean 'corsConfigurationSource'
Tomcat started on port(s): 8080
```

**Step 3: Test health endpoint (no CORS - same origin)**

In a new terminal:

```bash
curl http://127.0.0.1:8080/api/health
```

**Expected output:**
```json
{"status":"UP"}
```

**Step 4: Test CORS preflight from allowed origin**

```bash
curl -X OPTIONS http://127.0.0.1:8080/api/health \
  -H "Origin: http://127.0.0.1:5173" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected headers in response:**
```
Access-Control-Allow-Origin: http://127.0.0.1:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With
Access-Control-Max-Age: 3600
```

**Step 5: Test actual GET request with CORS headers**

```bash
curl http://127.0.0.1:8080/api/health \
  -H "Origin: http://127.0.0.1:5173" \
  -v 2>&1 | grep -i "access-control"
```

**Expected:**
```
< Access-Control-Allow-Origin: http://127.0.0.1:5173
< Access-Control-Allow-Credentials: true
```

**Step 6: Stop backend (Ctrl+C) and clean up**

```bash
docker stop spotease-postgres-test 2>/dev/null || true
docker rm spotease-postgres-test 2>/dev/null || true
```

**No commit needed (integration test only)**

---

## Task 8: Document CORS Configuration

**Files:**
- Modify: `spotease-backend/README.md` (or create if doesn't exist)

**Step 1: Check if README exists**

```bash
ls spotease-backend/README.md
```

**Step 2: Add CORS configuration section**

If README exists, append to it. If not, create it:

```bash
cat >> spotease-backend/README.md << 'EOF'

## CORS Configuration

### Overview

Spotease uses profile-based CORS configuration with explicit origin whitelisting to support cross-origin requests from the frontend while maintaining security.

### Configuration Files

- **Production:** `application.yml` - Default origin: `https://spotease.rivenlalala.xyz`
- **Development:** `application-dev.yml` - Local origin: `http://127.0.0.1:5173`

### Environment Variables

Override CORS origins using:
```bash
CORS_ALLOWED_ORIGINS=https://spotease.rivenlalala.xyz
```

Supports multiple origins (comma-separated):
```bash
CORS_ALLOWED_ORIGINS=https://spotease.rivenlalala.xyz,https://app.spotease.com
```

### Security Settings (Hardcoded)

- **Allowed Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers:** Content-Type, Authorization, Accept, X-Requested-With
- **Credentials:** Enabled (supports session cookies)
- **Max Age:** 3600 seconds (1 hour preflight cache)

### Session Cookie Configuration

**Production:**
- `SameSite`: Lax (allows OAuth redirects)
- `Secure`: true (HTTPS only)
- `HttpOnly`: true (XSS protection)
- `Domain`: .rivenlalala.xyz (shared across subdomains)

**Development:**
- `Secure`: false (allows HTTP)
- No domain setting (works with 127.0.0.1)

### Testing CORS Locally

```bash
# Start backend with dev profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Test CORS preflight in another terminal
curl -X OPTIONS http://127.0.0.1:8080/api/health \
  -H "Origin: http://127.0.0.1:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

**Expected:** CORS headers in response:
- `Access-Control-Allow-Origin: http://127.0.0.1:5173`
- `Access-Control-Allow-Credentials: true`

### Troubleshooting

**CORS headers not appearing:**
- Verify profile is active: Look for "The following profiles are active: dev"
- Check CORS origins match exactly (including protocol)

**Cookies not sent from frontend:**
- Ensure `credentials: 'include'` in fetch calls
- Verify `secure: false` in development profile

See `docs/plans/2025-12-29-cors-configuration-design.md` for complete design documentation.

EOF
```

**Step 3: Commit documentation**

```bash
git add spotease-backend/README.md
git commit -m "docs: add CORS configuration documentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Final Verification and Build

**Files:**
- No file changes (final verification)

**Step 1: Clean and build the project**

```bash
cd spotease-backend
mvn clean package -DskipTests
```

**Expected:** BUILD SUCCESS

**Step 2: Verify all profiles work**

Test with default profile (production):
```bash
mvn spring-boot:run -Dspring.config.activate.on-profile=prod
```

**Expected log:** "The following profiles are active: prod"

Stop with Ctrl+C, then test with dev profile:
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Expected log:** "The following profiles are active: dev"

Stop with Ctrl+C.

**Step 3: Verify CORS bean is created**

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev 2>&1 | grep -i corsConfiguration
```

**Expected output:**
```
Creating shared instance of singleton bean 'corsConfigurationSource'
```

Stop with Ctrl+C.

**Step 4: Run final CORS test**

Start backend:
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev &
BACKEND_PID=$!
sleep 10
```

Test CORS:
```bash
curl -X OPTIONS http://127.0.0.1:8080/api/health \
  -H "Origin: http://127.0.0.1:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep "Access-Control-Allow-Origin: http://127.0.0.1:5173" && echo "✅ CORS working!" || echo "❌ CORS failed!"
```

**Expected output:** `✅ CORS working!`

Stop backend:
```bash
kill $BACKEND_PID
```

**No commit needed (verification only)**

---

## Post-Implementation Checklist

After completing all tasks, verify:

- [ ] `application.yml` has production session cookie config and CORS origin
- [ ] `application-dev.yml` has development cookie config override
- [ ] `SecurityConfig.java` has CorsConfigurationSource bean
- [ ] `SecurityConfig.java` uses `.cors(Customizer.withDefaults())`
- [ ] Backend compiles successfully: `mvn compile`
- [ ] Backend builds successfully: `mvn package -DskipTests`
- [ ] CORS headers appear for allowed origins
- [ ] CORS headers absent for unauthorized origins
- [ ] Dev profile uses `http://127.0.0.1:5173`
- [ ] Prod profile defaults to `https://spotease.rivenlalala.xyz`
- [ ] Documentation added to README

---

## Next Steps (Not Part of This Plan)

After backend CORS is implemented and verified:

1. **Update Frontend API Client** (separate task)
   - Add `credentials: 'include'` to all fetch calls
   - OR set `axios.defaults.withCredentials = true` globally

2. **Deploy to Production** (separate task)
   - Ensure `.env` has `FRONTEND_URL=https://spotease.rivenlalala.xyz`
   - Verify `SPRING_PROFILES_ACTIVE=prod` in docker-compose.yml
   - Test CORS with production URLs

3. **Test OAuth Flow End-to-End** (separate task)
   - Verify login flow works with CORS
   - Verify session cookies are set and sent
   - Verify authenticated API calls work

---

## Summary

This plan implements production-level CORS configuration with:

- ✅ Profile-based origin whitelisting (dev/prod separation)
- ✅ Hardcoded security settings in Java (no configuration drift)
- ✅ Session cookie support with cross-origin credentials
- ✅ Subdomain cookie sharing for OAuth flow
- ✅ Explicit HTTP methods and headers (no wildcards)
- ✅ Integration tests to verify functionality
- ✅ Comprehensive documentation

**Total estimated time:** 30-45 minutes

**Reference:** See `docs/plans/2025-12-29-cors-configuration-design.md` for complete design rationale and security analysis.
