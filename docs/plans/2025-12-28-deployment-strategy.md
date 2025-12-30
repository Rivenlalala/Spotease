# Spotease Deployment Strategy

**Date:** 2025-12-28
**Last Updated:** 2025-12-31
**Status:** Implemented
**Target Environment:** Self-hosted VPS with Docker
**Domain:** spotease.rivenlalala.xyz / api.spotease.rivenlalala.xyz

---

## Executive Summary

Spotease is deployed as a Docker Compose stack on a self-hosted VPS with automated deployments via GitHub Actions. The architecture uses separate subdomains for frontend and backend, Nginx reverse proxy with SSL termination, and PostgreSQL for data persistence.

**Key Features:**
- Automated CI/CD via GitHub Actions
- HTTPS everywhere with Let's Encrypt
- WebSocket support for real-time updates
- Secure secrets management via GitHub Secrets
- Health checks on all containers
- Resource limits and log rotation
- Non-root container users for security
- Security headers on frontend (CSP, X-Frame-Options, etc.)

---

## 1. Architecture Overview

### Domain Structure

- **Frontend:** `spotease.rivenlalala.xyz` → React SPA served by Nginx
- **Backend:** `api.spotease.rivenlalala.xyz` → Spring Boot REST API + WebSocket
- **Database:** PostgreSQL (internal only, not exposed to internet)

### Network Flow

```
Internet
  ↓
Nginx Reverse Proxy (SSL termination, port 80/443)
  ├─→ spotease.rivenlalala.xyz → Frontend Container (Nginx + React static files)
  └─→ api.spotease.rivenlalala.xyz → Backend Container (Spring Boot:8080)
                                        └─→ PostgreSQL Container (internal network)
```

### Docker Network Topology

All services run on an isolated Docker bridge network named `spotease-network`:
- PostgreSQL accessible only to backend container
- Frontend and backend accessible via Nginx reverse proxy
- SSL certificates managed by Certbot, auto-renewed every 24 hours
- All containers have health checks for automatic recovery

---

## 2. Docker Compose Configuration

### Main Stack: `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: spotease-postgres
    environment:
      POSTGRES_DB: spotease
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - spotease-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${DB_USER} -d spotease"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    restart: unless-stopped

  backend:
    build:
      context: ./spotease-backend
      dockerfile: Dockerfile
    container_name: spotease-backend
    environment:
      SPRING_PROFILES_ACTIVE: prod
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/spotease
      SPRING_DATASOURCE_USERNAME: ${DB_USER}
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      SPOTIFY_CLIENT_ID: ${SPOTIFY_CLIENT_ID}
      SPOTIFY_CLIENT_SECRET: ${SPOTIFY_CLIENT_SECRET}
      SPOTIFY_REDIRECT_URI: ${SPOTIFY_REDIRECT_URI}
      CORS_ALLOWED_ORIGINS: ${FRONTEND_URL}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - spotease-network
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    restart: unless-stopped

  frontend:
    build:
      context: ./spotease-frontend
      dockerfile: Dockerfile
    container_name: spotease-frontend
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    networks:
      - spotease-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 64M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: spotease-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certbot/conf:/etc/letsencrypt:ro
      - ./nginx/certbot/www:/var/www/certbot:ro
    depends_on:
      backend:
        condition: service_healthy
      frontend:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    networks:
      - spotease-network
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    restart: unless-stopped

  certbot-renew:
    image: certbot/certbot
    container_name: spotease-certbot
    volumes:
      - ./nginx/certbot/conf:/etc/letsencrypt
      - ./nginx/certbot/www:/var/www/certbot
    networks:
      - spotease-network
    depends_on:
      - nginx
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew --webroot --webroot-path=/var/www/certbot; sleep 24h & wait $${!}; done;'"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    restart: unless-stopped

networks:
  spotease-network:
    driver: bridge

volumes:
  postgres_data:
```

### Local Development: `docker-compose.dev.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: spotease
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"  # Exposed to host for local development
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

volumes:
  postgres_dev_data:
```

---

## 3. Nginx Reverse Proxy Configuration

### Main Configuration: `nginx/nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # Backend API (api.spotease.rivenlalala.xyz)
    server {
        listen 80;
        server_name api.spotease.rivenlalala.xyz;

        # ACME challenge for Let's Encrypt
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name api.spotease.rivenlalala.xyz;

        ssl_certificate /etc/letsencrypt/live/api.spotease.rivenlalala.xyz/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.spotease.rivenlalala.xyz/privkey.pem;

        location / {
            proxy_pass http://backend:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Rate limiting
            limit_req zone=api_limit burst=20 nodelay;
        }
    }

    # Frontend (spotease.rivenlalala.xyz)
    server {
        listen 80;
        server_name spotease.rivenlalala.xyz;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name spotease.rivenlalala.xyz;

        ssl_certificate /etc/letsencrypt/live/spotease.rivenlalala.xyz/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/spotease.rivenlalala.xyz/privkey.pem;

        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

---

## 4. Dockerfile Configurations

### Backend: `spotease-backend/Dockerfile`

```dockerfile
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Copy pom.xml and download dependencies (cached layer)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn package -DskipTests -Dmaven.test.skip=true

FROM eclipse-temurin:17-jre-alpine

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy JAR with proper ownership
COPY --from=build --chown=appuser:appgroup /app/target/*.jar app.jar

# Switch to non-root user
USER appuser

EXPOSE 8080

# JVM configuration for containerized environments
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:InitialRAMPercentage=50.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]
```

### Frontend: `spotease-frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build with production environment
ENV NODE_ENV=production
RUN npm run build

FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set up permissions for non-root nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Frontend Nginx: `spotease-frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    server_tokens off;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.spotease.rivenlalala.xyz;" always;

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Prevent caching of index.html
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        expires 0;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache hashed static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Custom error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
        internal;
    }
}
```

---

## 5. GitHub Actions CI/CD Pipeline

### Workflow: `.github/workflows/deploy.yml`

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.VPS_SSH_KEY }}

      - name: Add VPS to known hosts
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -H ${{ secrets.VPS_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy to VPS
        env:
          VPS_USER: ${{ secrets.VPS_USER }}
          VPS_HOST: ${{ secrets.VPS_HOST }}
        run: |
          ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
            cd ~/spotease
            git pull origin main

            # Create .env file from GitHub secrets
            cat > .env << EOF
          DB_USER=${{ secrets.DB_USER }}
          DB_PASSWORD=${{ secrets.DB_PASSWORD }}
          ENCRYPTION_KEY=${{ secrets.ENCRYPTION_KEY }}
          SPOTIFY_CLIENT_ID=${{ secrets.SPOTIFY_CLIENT_ID }}
          SPOTIFY_CLIENT_SECRET=${{ secrets.SPOTIFY_CLIENT_SECRET }}
          SPOTIFY_REDIRECT_URI=https://api.spotease.rivenlalala.xyz/api/auth/spotify/callback
          NETEASE_API_URL=https://netease-api.rivenlalala.xyz
          FRONTEND_URL=https://spotease.rivenlalala.xyz
          EOF

            # Deploy with Docker Compose
            docker compose down
            docker compose build
            docker compose up -d

            # Cleanup
            docker system prune -f
          ENDSSH

      - name: Verify deployment
        env:
          VPS_USER: ${{ secrets.VPS_USER }}
          VPS_HOST: ${{ secrets.VPS_HOST }}
        run: |
          ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
            docker compose ps
            curl -f https://api.spotease.rivenlalala.xyz/api/health || exit 1
          ENDSSH
```

### Required GitHub Secrets

Navigate to: GitHub repo → Settings → Secrets and variables → Actions

| Secret Name | Description | Example / Generation |
|------------|-------------|---------------------|
| `VPS_SSH_KEY` | Private SSH key for VPS access | `ssh-keygen -t ed25519`, copy private key |
| `VPS_USER` | SSH username | `root` or `ubuntu` |
| `VPS_HOST` | VPS IP address or hostname | `123.45.67.89` |
| `DB_USER` | PostgreSQL username | `spotease_user` |
| `DB_PASSWORD` | PostgreSQL password | Strong random password |
| `ENCRYPTION_KEY` | 32-character encryption key | `openssl rand -base64 32` (first 32 chars) |
| `SPOTIFY_CLIENT_ID` | Spotify OAuth client ID | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | Spotify OAuth client secret | From Spotify Developer Dashboard |

---

## 6. SSL Certificate Setup

### Initial Certificate Generation

**File: `docker-compose.certbot.yml`** (one-time use)

```yaml
version: '3.8'

services:
  certbot:
    image: certbot/certbot
    volumes:
      - ./nginx/certbot/conf:/etc/letsencrypt
      - ./nginx/certbot/www:/var/www/certbot
    command: certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d spotease.rivenlalala.xyz -d api.spotease.rivenlalala.xyz

  nginx-temp:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/certbot/www:/var/www/certbot:ro
      - ./nginx/nginx-initial.conf:/etc/nginx/nginx.conf:ro
```

**File: `nginx/nginx-initial.conf`**

```nginx
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name spotease.rivenlalala.xyz api.spotease.rivenlalala.xyz;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
```

### Setup Steps

```bash
# 1. Ensure DNS is configured (A records pointing to VPS)
# 2. Create directories
mkdir -p nginx/certbot/conf nginx/certbot/www

# 3. Start temporary Nginx
docker compose -f docker-compose.certbot.yml up nginx-temp -d

# 4. Generate certificates
docker compose -f docker-compose.certbot.yml run --rm certbot

# 5. Stop temporary Nginx
docker compose -f docker-compose.certbot.yml down

# 6. Start main stack
docker compose up -d
```

### Auto-Renewal

The `certbot-renew` service in the main `docker-compose.yml` automatically renews certificates every 24 hours. Nginx reloads certificates without downtime.

---

## 7. Environment Configuration

### Template: `.env.example` (committed to repo)

```bash
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
```

### Backend Configuration Files

**Production: `application-prod.yml`**
```yaml
server:
  servlet:
    session:
      cookie:
        domain: .rivenlalala.xyz

spotease:
  spotify:
    redirect-uri: https://api.spotease.rivenlalala.xyz/api/auth/spotify/callback

cors:
  allowed-origins: ${CORS_ALLOWED_ORIGINS:https://spotease.rivenlalala.xyz}

logging:
  level:
    root: info
```

**Development: `application-dev.yml`**
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/spotease
    username: postgres
    password: postgres
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false

server:
  servlet:
    session:
      cookie:
        secure: false

spotease:
  encryption:
    key: ${ENCRYPTION_KEY}
  spotify:
    client-id: ${SPOTIFY_CLIENT_ID}
    client-secret: ${SPOTIFY_CLIENT_SECRET}
    redirect-uri: http://127.0.0.1:8080/api/auth/spotify/callback
  netease:
    api-url: ${NETEASE_API_URL:https://netease-api.rivenlalala.xyz}

cors:
  allowed-origins: http://127.0.0.1:5173
```

### Frontend Environment Files

**Production: `.env.production`**
```bash
VITE_API_BASE_URL=https://api.spotease.rivenlalala.xyz
VITE_WS_URL=wss://api.spotease.rivenlalala.xyz/ws/conversions
```

**Development: `.env.development`**
```bash
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_WS_URL=ws://127.0.0.1:8080/ws/conversions
```

---

## 8. Local Development Setup

### Development Workflow

```bash
# Terminal 1: Start PostgreSQL
docker compose -f docker-compose.dev.yml up

# Terminal 2: Start backend (from spotease-backend/)
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 3: Start frontend (from spotease-frontend/)
npm run dev
```

### Environment Selection

- **Production:** Uses `application.yml` + `application-prod.yml` (activated with `SPRING_PROFILES_ACTIVE=prod`)
- **Local Development:** Uses `application.yml` + `application-dev.yml` (activated with `-Dspring-boot.run.profiles=dev`)

---

## 9. Security Checklist

### Application Security

- HTTPS enforced on all endpoints (HTTP redirects to HTTPS)
- SSL certificates auto-renewed via Let's Encrypt
- Credentials stored in GitHub Secrets (never in code)
- CORS restricted to production domain
- Rate limiting on API endpoints (10 req/s with burst of 20)
- PostgreSQL not exposed to internet (internal Docker network only)
- Session cookies with `Secure` and `SameSite` flags
- OAuth tokens encrypted at rest in database (AES-256-GCM)
- WebSocket connections over WSS (WebSocket Secure)
- Security headers on frontend (CSP, X-Frame-Options, X-XSS-Protection, etc.)

### Infrastructure Security

- `.env` file in `.gitignore` (never committed)
- SSH key-based authentication for VPS (no password auth)
- Docker containers run as non-root users
- Regular security updates via `apt upgrade`
- Firewall configured (only ports 80, 443, and SSH open)
- Log rotation enabled (prevents disk exhaustion)

### Recommended Additional Security

```bash
# Configure UFW firewall
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable

# Disable password authentication for SSH
# Edit /etc/ssh/sshd_config:
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH
systemctl restart sshd

# Install fail2ban (brute force protection)
apt install fail2ban
systemctl enable fail2ban
```

---

## 10. Troubleshooting

### Common Issues

**Issue: SSL certificate generation fails**
```bash
# Solution: Ensure DNS is propagated
dig spotease.rivenlalala.xyz
dig api.spotease.rivenlalala.xyz

# Wait for DNS to propagate (can take up to 48 hours)
```

**Issue: Backend can't connect to PostgreSQL**
```bash
# Check if postgres container is running and healthy
docker compose ps

# Check postgres logs
docker compose logs postgres

# Verify network connectivity
docker compose exec backend wget -qO- http://localhost:8080/api/health
```

**Issue: Frontend shows CORS errors**
```bash
# Verify backend CORS configuration
cat .env | grep FRONTEND

# Restart backend
docker compose restart backend
```

**Issue: Container health check fails**
```bash
# Check health status
docker compose ps

# View detailed health info
docker inspect --format='{{json .State.Health}}' spotease-backend | jq

# Test health endpoints manually
docker compose exec backend wget -qO- http://localhost:8080/api/health
docker compose exec frontend wget -qO- http://localhost:80/health
```

**Issue: GitHub Actions deployment fails**
```bash
# Check SSH connection
ssh -i ~/.ssh/spotease_deploy user@vps-ip

# Verify VPS_SSH_KEY secret is correct (no extra whitespace)
# Check GitHub Actions logs for specific error

# Manually test deployment steps on VPS
cd ~/spotease
git pull origin main
docker compose up -d --build
```

**Issue: Out of disk space**
```bash
# Clean up Docker resources
docker system prune -a -f

# Check disk usage
df -h

# Remove old PostgreSQL backups
rm ~/spotease/backups/backup-*.sql
```

---

## 11. Cost Breakdown

### VPS (Already Owned)
- **Cost:** $0 (existing resource)
- **Specs:** Sufficient for Docker Compose stack

### Domain & SSL
- **Domain:** Included (using existing rivenlalala.xyz)
- **Subdomain:** Free
- **SSL Certificates:** Free (Let's Encrypt)

### External Services
- **Spotify API:** Free tier (sufficient for MVP)
- **NetEase API:** Self-hosted at https://netease-api.rivenlalala.xyz

### Total Monthly Cost
- **$0** - All resources either owned or free tier

---

## Appendix A: Complete File Structure

```
spotease/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── spotease-backend/
│   ├── src/
│   │   └── main/
│   │       └── resources/
│   │           ├── application.yml
│   │           ├── application-dev.yml
│   │           └── application-prod.yml
│   ├── pom.xml
│   └── Dockerfile
├── spotease-frontend/
│   ├── src/
│   ├── package.json
│   ├── nginx.conf
│   ├── .env.development
│   ├── .env.production
│   └── Dockerfile
├── nginx/
│   ├── nginx.conf
│   ├── nginx-initial.conf
│   └── certbot/
│       ├── conf/
│       └── www/
├── docs/
│   └── plans/
│       ├── 2025-12-28-deployment-strategy.md
│       └── 2025-12-28-deployment-implementation.md
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.certbot.yml
├── .env.example
├── .gitignore
├── DEPLOYMENT.md
├── DEPLOYMENT-CHECKLIST.md
└── README.md
```

---

## Appendix B: Quick Reference Commands

```bash
# Development
docker compose -f docker-compose.dev.yml up          # Start local PostgreSQL
mvn spring-boot:run -Dspring-boot.run.profiles=dev  # Run backend
npm run dev                                          # Run frontend

# Production Deployment
git push origin main                                 # Deploy via GitHub Actions
docker compose up -d                                 # Manual deploy
docker compose logs -f                               # View logs
docker compose restart <service>                     # Restart service

# Maintenance
docker compose ps                                    # Check status
docker stats                                         # Resource usage
docker system prune -f                               # Clean up

# Database
docker exec spotease-postgres pg_dump -U spotease_user spotease > backup.sql
cat backup.sql | docker exec -i spotease-postgres psql -U spotease_user spotease

# SSL
certbot renew --dry-run                             # Test renewal
openssl x509 -in cert.pem -text -noout              # Inspect certificate

# Health Checks
curl https://api.spotease.rivenlalala.xyz/api/health
curl -I https://spotease.rivenlalala.xyz
```

---

**End of Deployment Strategy Document**
