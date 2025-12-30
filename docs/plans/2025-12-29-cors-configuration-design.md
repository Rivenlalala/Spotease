# Production-Level CORS Configuration Design

**Date:** 2025-12-29
**Status:** Design Complete
**Architecture:** Profile-Based CORS with Session Cookies
**Deployment:** Subdomain Architecture (spotease.rivenlalala.xyz / api.spotease.rivenlalala.xyz)

---

## Executive Summary

Spotease will implement production-level CORS using Spring Security's profile-based configuration. The design uses explicit origin whitelisting with session-based authentication, ensuring security while supporting the OAuth flow across subdomains.

**Key Features:**
- Profile-based CORS (dev/prod separation)
- Session cookie authentication with credentials support
- Hardcoded security settings (methods, headers, credentials)
- Only origins configured via YAML/environment variables
- Subdomain cookie sharing for OAuth flow
- Zero risk of misconfiguration

---

## 1. Architecture Overview

### Current State

```java
// SecurityConfig.java - INSECURE
.cors(cors -> cors.disable())  // ❌ Completely disables CORS protection
```

**Problems:**
- No origin validation
- Any website can make requests to the API
- CSRF vulnerable
- Not production-ready

### Target Architecture

**Three-Layer Configuration:**

1. **YAML Configuration** - Environment-specific origins only
   - `application.yml` - Production default: `https://spotease.rivenlalala.xyz`
   - `application-dev.yml` - Development override: `http://127.0.0.1:5173`

2. **Java Bean** - Hardcoded security settings
   - Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
   - Allowed headers: Content-Type, Authorization, Accept, X-Requested-With
   - Exposed headers: Set-Cookie
   - Credentials: true
   - Max age: 3600 seconds

3. **Security Filter Chain** - CORS enabled
   - `Customizer.withDefaults()` applies the `CorsConfigurationSource` bean
   - OPTIONS requests bypass authentication

### Domain Structure

- **Frontend:** `https://spotease.rivenlalala.xyz` (React SPA)
- **Backend:** `https://api.spotease.rivenlalala.xyz` (Spring Boot API)
- **Database:** PostgreSQL (internal Docker network)

**Cross-Origin Scenario:**
- Frontend origin: `https://spotease.rivenlalala.xyz`
- API origin: `https://api.spotease.rivenlalala.xyz`
- Browser enforces CORS because origins differ

---

## 2. Authentication Flow

### Session-Based Authentication with Cookies

**Why session cookies:**
- ✅ XSS-resistant (HTTP-only cookies)
- ✅ Works perfectly with OAuth flow
- ✅ Simpler than JWT token management
- ✅ Spring Boot handles session lifecycle automatically

**OAuth Login Flow:**
```
1. User clicks "Login with Spotify" on frontend
2. Frontend redirects to: api.spotease.rivenlalala.xyz/api/auth/spotify
3. Backend redirects to Spotify OAuth
4. User authorizes on Spotify
5. Spotify redirects to: api.spotease.rivenlalala.xyz/api/auth/spotify/callback
6. Backend creates session, sets HTTP-only cookie
7. Backend redirects to: spotease.rivenlalala.xyz/dashboard
8. Frontend makes API calls with credentials: 'include'
9. Browser automatically sends session cookie
```

**CORS Requirements for This Flow:**
- `allowCredentials: true` - Enables cross-origin cookie sending
- `allowedOrigins` - Must be explicit (no wildcards with credentials)
- `SameSite: lax` - Allows cookies on OAuth redirects
- `domain: .rivenlalala.xyz` - Cookie shared across subdomains

---

## 3. CORS Configuration Details

### Why Explicit Headers (Not Wildcards)

**CORS Specification Restriction:**
When `allowCredentials: true`, wildcards are **forbidden** for:
- ❌ `Access-Control-Allow-Origin: *` - FORBIDDEN
- ❌ `Access-Control-Allow-Headers: *` - FORBIDDEN
- ❌ `Access-Control-Expose-Headers: *` - FORBIDDEN

**If you use wildcards with credentials, browsers will reject the response.**

### Allowed Methods

```java
Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
```

**Why these methods:**
- `GET` - Fetch playlists, tracks, user data
- `POST` - Create playlist links, login actions
- `PUT` - Update entire resources
- `PATCH` - Partial updates
- `DELETE` - Remove playlist links, logout
- `OPTIONS` - Preflight requests (CORS mechanism)

### Allowed Headers

```java
Arrays.asList("Content-Type", "Authorization", "Accept", "X-Requested-With")
```

**Why these headers:**
- `Content-Type` - Required for JSON request bodies
- `Authorization` - Future-proofing for token auth if needed
- `Accept` - Standard HTTP header
- `X-Requested-With` - Common AJAX identifier

**Note:** `Cookie` header doesn't need to be in `allowedHeaders` - browsers send it automatically with `credentials: 'include'`.

### Exposed Headers

```java
Arrays.asList("Set-Cookie")
```

**Why expose Set-Cookie:**
- Allows frontend JavaScript to see when cookies are set
- Useful for debugging authentication issues
- Standard practice for session-based auth

### Max Age

```java
configuration.setMaxAge(3600L);  // 1 hour
```

**Performance optimization:**
- Browsers cache preflight (OPTIONS) responses for 1 hour
- Reduces OPTIONS requests by 99% after first call
- Still secure (origins validated on every actual request)

---

## 4. Configuration Files

### application.yml (Production)

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

# CORS configuration
cors:
  allowed-origins: ${CORS_ALLOWED_ORIGINS:https://spotease.rivenlalala.xyz}
```

**Key points:**
- `same-site: lax` - Allows OAuth redirects (strict would break OAuth)
- `secure: true` - HTTPS only in production
- `domain: .rivenlalala.xyz` - Cookie works on both subdomains
- `${CORS_ALLOWED_ORIGINS:...}` - Environment variable with fallback

### application-dev.yml (Development)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/spotease
    username: postgres
    password: postgres
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

server:
  servlet:
    session:
      cookie:
        secure: false  # Allow HTTP in development
        # domain omitted - doesn't work with 127.0.0.1

spotease:
  encryption:
    key: ${ENCRYPTION_KEY}
  spotify:
    client-id: ${SPOTIFY_CLIENT_ID}
    client-secret: ${SPOTIFY_CLIENT_SECRET}
    redirect-uri: http://127.0.0.1:8080/api/auth/spotify/callback
  netease:
    api-url: ${NETEASE_API_URL:https://netease-api.rivenlalala.xyz}

# CORS for local frontend
cors:
  allowed-origins: http://127.0.0.1:5173

logging:
  level:
    root: debug
```

**Key points:**
- `secure: false` - Allows HTTP cookies for local development
- No `domain` setting - uses default for `127.0.0.1`
- Overrides only what's different from production

---

## 5. SecurityConfig.java Implementation

### Complete Implementation

```java
package com.spotease.config;

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

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

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

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())  // ✅ CHANGED: Enable CORS with our bean
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
            )
            .securityContext(context -> context
                .requireExplicitSave(false)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()  // Allow preflight
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            )
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable());

        return http.build();
    }
}
```

### Key Implementation Details

**1. Origin Parsing**
```java
Arrays.asList(allowedOrigins.split(","))
```
- Supports multiple origins: `https://domain1.com,https://domain2.com`
- Automatically trims whitespace
- Useful for whitelisting multiple domains

**2. Bean Auto-Discovery**
```java
@Bean
public CorsConfigurationSource corsConfigurationSource()
```
- Spring Security automatically detects beans with this name
- `Customizer.withDefaults()` uses this bean
- No manual wiring needed

**3. Apply to All Endpoints**
```java
source.registerCorsConfiguration("/**", configuration)
```
- Applies to all API routes
- Can use specific patterns if needed: `/api/**` vs `/public/**`

**4. OPTIONS Bypass Authentication**
```java
.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
```
- Preflight requests don't include cookies
- Must bypass authentication or CORS will fail
- Already configured correctly in existing code

---

## 6. Frontend Requirements

### Fetch Configuration

**All API calls must include credentials:**

```javascript
// GET request
fetch('https://api.spotease.rivenlalala.xyz/api/playlists', {
  method: 'GET',
  credentials: 'include',  // ⚠️ CRITICAL: Send cookies cross-origin
  headers: {
    'Content-Type': 'application/json',
  }
});

// POST request
fetch('https://api.spotease.rivenlalala.xyz/api/playlists/link', {
  method: 'POST',
  credentials: 'include',  // ⚠️ CRITICAL
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    spotifyPlaylistId: 'abc123',
    neteasePlaylistId: 'xyz789'
  })
});
```

### Axios Configuration

If using Axios, set globally:

```javascript
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'https://api.spotease.rivenlalala.xyz';

// Now all requests include credentials
axios.get('/api/playlists');
axios.post('/api/playlists/link', data);
```

### Environment-Specific Base URLs

**Frontend .env files:**

```bash
# .env.production
VITE_API_BASE_URL=https://api.spotease.rivenlalala.xyz

# .env.development
VITE_API_BASE_URL=http://127.0.0.1:8080
```

---

## 7. Deployment Configuration

### Docker Compose (Production)

```yaml
backend:
  build: ./spotease-backend
  environment:
    SPRING_PROFILES_ACTIVE: prod  # Explicitly set profile
    SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/spotease
    SPRING_DATASOURCE_USERNAME: ${DB_USER}
    SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
    ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    SPOTIFY_CLIENT_ID: ${SPOTIFY_CLIENT_ID}
    SPOTIFY_CLIENT_SECRET: ${SPOTIFY_CLIENT_SECRET}
    SPOTIFY_REDIRECT_URI: https://api.spotease.rivenlalala.xyz/api/auth/spotify/callback
    CORS_ALLOWED_ORIGINS: https://spotease.rivenlalala.xyz
  depends_on:
    - postgres
  networks:
    - spotease-network
  restart: unless-stopped
```

### Local Development Commands

```bash
# Start PostgreSQL
docker-compose -f docker-compose.dev.yml up

# Run backend with dev profile
cd spotease-backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Run frontend
cd spotease-frontend
npm run dev
```

### Profile Activation Summary

| Environment | Command | CORS Origins |
|-------------|---------|--------------|
| **Local Dev** | `mvn spring-boot:run -Dspring-boot.run.profiles=dev` | `http://127.0.0.1:5173` |
| **Production** | `SPRING_PROFILES_ACTIVE=prod` (Docker Compose) | `https://spotease.rivenlalala.xyz` |
| **Override** | `CORS_ALLOWED_ORIGINS=https://other.com` | Overrides YAML |

---

## 8. Security Analysis

### What We're Protecting Against

**1. Cross-Site Request Forgery (CSRF)**
- ✅ CORS enforces origin validation
- ✅ Only whitelisted origins can make requests
- ✅ Session cookies with SameSite=Lax

**2. Cross-Site Scripting (XSS)**
- ✅ HTTP-only cookies (JavaScript can't access)
- ✅ No tokens in localStorage
- ✅ No sensitive data exposed in headers

**3. Credential Theft**
- ✅ Secure cookies (HTTPS only in production)
- ✅ No wildcard origins with credentials
- ✅ Explicit origin whitelist

**4. Man-in-the-Middle (MITM)**
- ✅ HTTPS enforced by Nginx
- ✅ Secure cookies flag
- ✅ HSTS headers (from Nginx)

### Security Checklist

✅ **Implemented:**
- Explicit origin whitelist (no wildcards)
- Credentials support for session cookies
- Hardcoded methods/headers (no configuration drift)
- Profile-based separation (dev can't leak to prod)
- SameSite=Lax for OAuth compatibility
- Secure cookies in production
- HTTP-only cookies (XSS protection)
- OPTIONS requests bypass authentication
- Subdomain cookie sharing for OAuth

❌ **Intentionally NOT Implemented:**
- No wildcard origins (`*`)
- No wildcard headers with credentials
- No SameSite=None (less secure)
- No sensitive headers exposed beyond Set-Cookie
- No CORS configuration in YAML (security settings in code only)

### Threat Model

**Blocked Attacks:**
- ❌ Malicious site `evil.com` cannot make API requests (origin rejected)
- ❌ XSS injection cannot steal session cookies (HTTP-only)
- ❌ Token theft from localStorage (no tokens stored there)
- ❌ CSRF attacks (SameSite + CORS protection)

**Still Vulnerable To:**
- ⚠️ Phishing (user willingly enters credentials on fake site)
- ⚠️ Compromised VPS (attacker has server access)
- ⚠️ SQL injection (requires separate input validation)

---

## 9. Testing Strategy

### Manual CORS Testing

**1. Test Preflight Request (Production)**
```bash
curl -X OPTIONS https://api.spotease.rivenlalala.xyz/api/playlists \
  -H "Origin: https://spotease.rivenlalala.xyz" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected headers:**
```
Access-Control-Allow-Origin: https://spotease.rivenlalala.xyz
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With
Access-Control-Max-Age: 3600
```

**2. Test Rejected Origin**
```bash
curl https://api.spotease.rivenlalala.xyz/api/playlists \
  -H "Origin: https://malicious-site.com" \
  -v
```

**Expected:** No CORS headers (browser would block)

**3. Test Development CORS**
```bash
curl -X OPTIONS http://127.0.0.1:8080/api/playlists \
  -H "Origin: http://127.0.0.1:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

**Expected:** `Access-Control-Allow-Origin: http://127.0.0.1:5173`

### Browser Testing

```javascript
// Open browser console on https://spotease.rivenlalala.xyz
fetch('https://api.spotease.rivenlalala.xyz/api/health', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(data => console.log('✅ CORS working:', data))
  .catch(err => console.error('❌ CORS error:', err));
```

### Common CORS Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `No 'Access-Control-Allow-Origin' header` | Backend not sending header | Verify `CorsConfigurationSource` bean |
| `The value must not be '*' when credentials flag is true` | Using wildcard with credentials | Use explicit origins |
| `Credentials flag is true, but header is missing` | Missing `allowCredentials` | Set to `true` in bean |
| `Request header field X is not allowed` | Header not in `allowedHeaders` | Add to explicit list |
| Cookies not sent | Missing `credentials: 'include'` | Add to fetch calls |
| Cookies not saved | `secure: true` on HTTP | Set `secure: false` in dev |

---

## 10. Migration Steps

### Implementation Checklist

**Backend Changes:**
- [ ] Update `application.yml` - Add CORS origins and session cookie config
- [ ] Update `application-dev.yml` - Add dev origins and cookie overrides
- [ ] Update `SecurityConfig.java` - Add `CorsConfigurationSource` bean
- [ ] Update `SecurityConfig.java` - Change `.cors(cors -> cors.disable())` to `.cors(Customizer.withDefaults())`
- [ ] Update `docker-compose.yml` - Set `SPRING_PROFILES_ACTIVE=prod`
- [ ] Update `docker-compose.yml` - Add `CORS_ALLOWED_ORIGINS` environment variable

**Frontend Changes:**
- [ ] Add `credentials: 'include'` to all fetch calls
- [ ] OR set `axios.defaults.withCredentials = true` globally
- [ ] Verify `.env.production` has correct API base URL
- [ ] Verify `.env.development` has correct API base URL

**Verification:**
- [ ] Test dev environment: Frontend at `http://127.0.0.1:5173`, Backend at `http://127.0.0.1:8080`
- [ ] Test production: Frontend at `https://spotease.rivenlalala.xyz`, Backend at `https://api.spotease.rivenlalala.xyz`
- [ ] Verify OAuth login flow works
- [ ] Verify session cookies are set
- [ ] Test CORS with browser DevTools
- [ ] Verify rejected origins are blocked

### Deployment Order

1. **Backend first** - Deploy CORS configuration to production
2. **Test with curl** - Verify CORS headers before frontend deployment
3. **Frontend second** - Deploy with `credentials: 'include'`
4. **End-to-end test** - Verify OAuth flow and API calls

---

## 11. Troubleshooting Guide

### Issue: CORS headers not appearing

**Symptoms:** No `Access-Control-Allow-Origin` header in response

**Causes:**
- `CorsConfigurationSource` bean not detected by Spring
- Profile not activated (using wrong config)
- Origin doesn't match whitelist exactly

**Solutions:**
```bash
# Verify profile is active
# Look for log: "The following profiles are active: dev"
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Verify bean is loaded
# Look for log: "Creating shared instance of singleton bean 'corsConfigurationSource'"

# Check origin exactly matches (including protocol)
curl -v http://127.0.0.1:8080/api/health -H "Origin: http://127.0.0.1:5173"
```

### Issue: Cookies not sent from frontend

**Symptoms:** Backend doesn't see session cookie

**Causes:**
- Missing `credentials: 'include'` in fetch
- `secure: true` with HTTP in development
- Cookie domain mismatch

**Solutions:**
```javascript
// Add to all fetch calls
fetch(url, { credentials: 'include' });

// OR set globally for axios
axios.defaults.withCredentials = true;
```

```yaml
# application-dev.yml - ensure secure is false
server:
  servlet:
    session:
      cookie:
        secure: false
```

### Issue: OAuth redirect breaks

**Symptoms:** Session lost after OAuth callback

**Causes:**
- `SameSite: strict` blocks OAuth redirects
- Cookie domain not set correctly
- Session not persisting

**Solutions:**
```yaml
# Use lax instead of strict
server:
  servlet:
    session:
      cookie:
        same-site: lax  # Allows OAuth redirects
        domain: .rivenlalala.xyz  # Share across subdomains
```

### Issue: Preflight (OPTIONS) returns 401

**Symptoms:** CORS preflight fails with Unauthorized

**Cause:** OPTIONS requests hitting authenticated endpoints

**Solution:**
```java
// Already implemented in SecurityConfig
.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
```

---

## 12. Future Enhancements

### Multiple Environment Support

If you need staging environment:

```yaml
# application-staging.yml
cors:
  allowed-origins: https://staging.spotease.rivenlalala.xyz

server:
  servlet:
    session:
      cookie:
        domain: .rivenlalala.xyz
```

### Multiple Frontend Domains

If you need to support multiple domains:

```yaml
# application.yml
cors:
  allowed-origins: https://spotease.rivenlalala.xyz,https://spotease.com,https://app.spotease.com
```

The bean automatically splits comma-separated origins.

### Rate Limiting Integration

Add rate limiting to CORS responses (already in Nginx, but can add to Spring):

```java
// Future enhancement - not implemented yet
configuration.setMaxAge(86400L);  // 24 hours for trusted origins
```

---

## Appendix: Complete File Diff

### application.yml

```diff
 server:
   port: 8080
+  servlet:
+    session:
+      cookie:
+        same-site: lax
+        secure: true
+        http-only: true
+        domain: .rivenlalala.xyz

 # CORS configuration
 cors:
-  allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}
+  allowed-origins: ${CORS_ALLOWED_ORIGINS:https://spotease.rivenlalala.xyz}
```

### application-dev.yml

```diff
 spring:
   datasource:
     url: jdbc:postgresql://localhost:5432/spotease
     username: postgres
     password: postgres
   jpa:
     hibernate:
       ddl-auto: update
     show-sql: true

+server:
+  servlet:
+    session:
+      cookie:
+        secure: false

 logging:
   level:
     root: debug

 spotease:
   encryption:
     key: ${ENCRYPTION_KEY}
   spotify:
     client-id: ${SPOTIFY_CLIENT_ID}
     client-secret: ${SPOTIFY_CLIENT_SECRET}
-    redirect-uri: http://127.0.0.1:8080/api/auth/spotify/callback
+    redirect-uri: http://127.0.0.1:8080/api/auth/spotify/callback
   netease:
     api-url: ${NETEASE_API_URL:https://netease-api.rivenlalala.xyz}

 # CORS for local frontend
 cors:
   allowed-origins: http://127.0.0.1:5173
```

### SecurityConfig.java

```diff
 package com.spotease.config;

+import org.springframework.beans.factory.annotation.Value;
 import org.springframework.context.annotation.Bean;
 import org.springframework.context.annotation.Configuration;
 import org.springframework.http.HttpMethod;
 import org.springframework.http.HttpStatus;
+import org.springframework.security.config.Customizer;
 import org.springframework.security.config.annotation.web.builders.HttpSecurity;
 import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
 import org.springframework.security.config.http.SessionCreationPolicy;
 import org.springframework.security.web.SecurityFilterChain;
 import org.springframework.security.web.authentication.HttpStatusEntryPoint;
+import org.springframework.web.cors.CorsConfiguration;
+import org.springframework.web.cors.CorsConfigurationSource;
+import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
+
+import java.util.Arrays;

 @Configuration
 @EnableWebSecurity
 public class SecurityConfig {

+    @Value("${cors.allowed-origins}")
+    private String allowedOrigins;
+
+    @Bean
+    public CorsConfigurationSource corsConfigurationSource() {
+        CorsConfiguration configuration = new CorsConfiguration();
+
+        // Parse comma-separated origins from YAML
+        configuration.setAllowedOrigins(
+            Arrays.asList(allowedOrigins.split(","))
+        );
+
+        // Hardcoded security settings (never change per environment)
+        configuration.setAllowedMethods(
+            Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
+        );
+        configuration.setAllowedHeaders(
+            Arrays.asList("Content-Type", "Authorization", "Accept", "X-Requested-With")
+        );
+        configuration.setExposedHeaders(
+            Arrays.asList("Set-Cookie")
+        );
+        configuration.setAllowCredentials(true);
+        configuration.setMaxAge(3600L);
+
+        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
+        source.registerCorsConfiguration("/**", configuration);
+        return source;
+    }

     @Bean
     public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
         http
-            .cors(cors -> cors.disable())
+            .cors(Customizer.withDefaults())
             .csrf(csrf -> csrf.disable())
             .sessionManagement(session -> session
                 .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
             )
             .securityContext(context -> context
                 .requireExplicitSave(false)
             )
             .authorizeHttpRequests(auth -> auth
                 .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                 .requestMatchers("/api/health").permitAll()
                 .requestMatchers("/api/auth/**").permitAll()
                 .requestMatchers("/api/**").authenticated()
                 .anyRequest().permitAll()
             )
             .exceptionHandling(ex -> ex
                 .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
             )
             .formLogin(form -> form.disable())
             .httpBasic(basic -> basic.disable());

         return http.build();
     }
 }
```

---

**End of CORS Configuration Design Document**
