# Deployment Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up complete Docker-based deployment infrastructure with automated CI/CD for VPS deployment.

**Architecture:** Docker Compose stack with Spring Boot backend, React frontend served by Nginx, PostgreSQL database, Nginx reverse proxy for SSL termination, and GitHub Actions for automated deployment to VPS at spotease.rivenlalala.xyz.

**Tech Stack:** Docker, Docker Compose, Nginx, Let's Encrypt, GitHub Actions, PostgreSQL 15

---

## Task 1: Create Backend Dockerfile

**Files:**
- Create: `spotease-backend/Dockerfile`

**Step 1: Create multi-stage Dockerfile for backend**

Create: `spotease-backend/Dockerfile`
```dockerfile
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Step 2: Verify Dockerfile syntax**

Run:
```bash
cd spotease-backend
docker build -t spotease-backend-test .
```

Expected: Build succeeds, image created (may take 3-5 minutes for first build due to Maven dependencies)

**Step 3: Test backend container locally**

Run:
```bash
docker run --rm -p 8080:8080 -e ENCRYPTION_KEY=test12345678901234567890123456 -e SPOTIFY_CLIENT_ID=test -e SPOTIFY_CLIENT_SECRET=test spotease-backend-test
```

Expected: Container starts, Spring Boot logs appear (will fail to connect to database, that's OK)

**Step 4: Stop test container**

Press Ctrl+C

**Step 5: Clean up test image**

Run:
```bash
docker rmi spotease-backend-test
```

**Step 6: Commit backend Dockerfile**

```bash
git add spotease-backend/Dockerfile
git commit -m "build: add multi-stage Dockerfile for backend"
```

---

## Task 2: Create Frontend Dockerfile and Nginx Config

**Files:**
- Create: `spotease-frontend/Dockerfile`
- Create: `spotease-frontend/nginx.conf`

**Step 1: Create Nginx config for serving React SPA**

Create: `spotease-frontend/nginx.conf`
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Step 2: Create multi-stage Dockerfile for frontend**

Create: `spotease-frontend/Dockerfile`
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**Step 3: Verify frontend Dockerfile builds**

Run:
```bash
cd spotease-frontend
docker build -t spotease-frontend-test .
```

Expected: Build succeeds (may take 2-3 minutes for first build)

**Step 4: Test frontend container**

Run:
```bash
docker run --rm -p 5173:80 spotease-frontend-test
```

**Step 5: Verify frontend serves**

Open browser to http://localhost:5173
Expected: React app loads (may show API connection errors, that's OK)

**Step 6: Stop test container**

Press Ctrl+C

**Step 7: Clean up test image**

Run:
```bash
docker rmi spotease-frontend-test
```

**Step 8: Commit frontend Docker files**

```bash
git add spotease-frontend/Dockerfile spotease-frontend/nginx.conf
git commit -m "build: add multi-stage Dockerfile and Nginx config for frontend"
```

---

## Task 3: Create Main Docker Compose Configuration

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create Docker Compose file**

Create: `docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: spotease
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - spotease-network
    restart: unless-stopped

  backend:
    build: ./spotease-backend
    environment:
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

  frontend:
    build: ./spotease-frontend
    networks:
      - spotease-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certbot/conf:/etc/letsencrypt:ro
      - ./nginx/certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
      - frontend
    networks:
      - spotease-network
    restart: unless-stopped

  certbot-renew:
    image: certbot/certbot
    volumes:
      - ./nginx/certbot/conf:/etc/letsencrypt
      - ./nginx/certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  spotease-network:
    driver: bridge

volumes:
  postgres_data:
```

**Step 2: Verify Docker Compose syntax**

Run:
```bash
docker-compose config
```

Expected: Parsed YAML output with no errors

**Step 3: Commit Docker Compose file**

```bash
git add docker-compose.yml
git commit -m "build: add main Docker Compose configuration"
```

---

## Task 4: Create Development Docker Compose

**Files:**
- Create: `docker-compose.dev.yml`

**Step 1: Create development Docker Compose**

Create: `docker-compose.dev.yml`
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
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

volumes:
  postgres_dev_data:
```

**Step 2: Test local development setup**

Run:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

Expected: PostgreSQL container starts

**Step 3: Verify PostgreSQL is accessible**

Run:
```bash
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "SELECT version();"
```

Expected: PostgreSQL version information displayed

**Step 4: Stop development stack**

Run:
```bash
docker-compose -f docker-compose.dev.yml down
```

**Step 5: Commit development Docker Compose**

```bash
git add docker-compose.dev.yml
git commit -m "build: add Docker Compose for local development"
```

---

## Task 5: Create Certbot Docker Compose

**Files:**
- Create: `docker-compose.certbot.yml`

**Step 1: Create Certbot Docker Compose for SSL setup**

Create: `docker-compose.certbot.yml`
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

**Step 2: Commit Certbot Docker Compose**

```bash
git add docker-compose.certbot.yml
git commit -m "build: add Docker Compose for SSL certificate generation"
```

---

## Task 6: Create Nginx Reverse Proxy Configuration

**Files:**
- Create: `nginx/nginx.conf`
- Create: `nginx/nginx-initial.conf`

**Step 1: Create nginx directory**

Run:
```bash
mkdir -p nginx
```

**Step 2: Create initial Nginx config for cert generation**

Create: `nginx/nginx-initial.conf`
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

**Step 3: Create main Nginx reverse proxy config**

Create: `nginx/nginx.conf`
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

**Step 4: Create certbot directories**

Run:
```bash
mkdir -p nginx/certbot/conf nginx/certbot/www
```

**Step 5: Commit Nginx configurations**

```bash
git add nginx/
git commit -m "build: add Nginx reverse proxy and SSL configurations"
```

---

## Task 7: Create Environment Configuration Files

**Files:**
- Create: `.env.example`
- Create: `spotease-backend/src/main/resources/application-dev.yml`
- Create: `spotease-frontend/.env.development`
- Create: `spotease-frontend/.env.production`

**Step 1: Create .env.example template**

Create: `.env.example`
```bash
# Database
DB_USER=spotease_user
DB_PASSWORD=change_me_in_production

# Application Security
ENCRYPTION_KEY=change_me_32_character_string

# Spotify OAuth
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# NetEase API
NETEASE_API_URL=https://netease-api.rivenlalala.xyz

# Environment
ENVIRONMENT=production
```

**Step 2: Create backend development configuration**

Create: `spotease-backend/src/main/resources/application-dev.yml`
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

spotease:
  encryption:
    key: ${ENCRYPTION_KEY:dev12345678901234567890123456789}
  spotify:
    client-id: ${SPOTIFY_CLIENT_ID:changeme}
    client-secret: ${SPOTIFY_CLIENT_SECRET:changeme}
    redirect-uri: http://localhost:8080/api/auth/spotify/callback
  netease:
    api-url: ${NETEASE_API_URL:https://netease-api.rivenlalala.xyz}

# CORS for local frontend
cors:
  allowed-origins: http://localhost:5173
```

**Step 3: Create frontend development environment**

Create: `spotease-frontend/.env.development`
```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws/conversions
```

**Step 4: Create frontend production environment**

Create: `spotease-frontend/.env.production`
```bash
VITE_API_BASE_URL=https://api.spotease.rivenlalala.xyz
VITE_WS_URL=wss://api.spotease.rivenlalala.xyz/ws/conversions
```

**Step 5: Update .gitignore to allow .env.example**

Modify: `.gitignore`

Change line 37 from:
```
.env*
```

To:
```
.env*
!.env.example
```

**Step 6: Commit environment configurations**

```bash
git add .env.example spotease-backend/src/main/resources/application-dev.yml spotease-frontend/.env.development spotease-frontend/.env.production .gitignore
git commit -m "config: add environment configuration files for dev and prod"
```

---

## Task 8: Update Backend for Production CORS

**Files:**
- Modify: `spotease-backend/src/main/resources/application.yml`
- Modify: `spotease-backend/src/main/java/com/spotease/config/SecurityConfig.java:35-45`

**Step 1: Add CORS configuration to application.yml**

Modify: `spotease-backend/src/main/resources/application.yml`

Add after line 27 (after netease config):
```yaml

# CORS configuration
cors:
  allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}
```

**Step 2: Update SecurityConfig to use environment-aware CORS**

Modify: `spotease-backend/src/main/java/com/spotease/config/SecurityConfig.java`

Add import after line 12:
```java
import org.springframework.beans.factory.annotation.Value;
```

Add field after line 16 (inside SecurityConfig class):
```java

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;
```

Replace the corsConfigurationSource method (lines 34-45) with:
```java
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
```

**Step 3: Verify backend compiles**

Run:
```bash
cd spotease-backend
mvn compile
```

Expected: BUILD SUCCESS

**Step 4: Commit CORS configuration updates**

```bash
git add spotease-backend/src/main/resources/application.yml spotease-backend/src/main/java/com/spotease/config/SecurityConfig.java
git commit -m "config: add environment-aware CORS configuration for production"
```

---

## Task 9: Create GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Create GitHub Actions directory**

Run:
```bash
mkdir -p .github/workflows
```

**Step 2: Create deployment workflow**

Create: `.github/workflows/deploy.yml`
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
          NETEASE_API_URL=https://netease-api.rivenlalala.xyz
          CORS_ALLOWED_ORIGINS=https://spotease.rivenlalala.xyz
          EOF

            # Deploy with Docker Compose
            docker-compose down
            docker-compose build
            docker-compose up -d

            # Cleanup
            docker system prune -f
          ENDSSH

      - name: Verify deployment
        env:
          VPS_USER: ${{ secrets.VPS_USER }}
          VPS_HOST: ${{ secrets.VPS_HOST }}
        run: |
          ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
            docker-compose ps
            curl -f https://api.spotease.rivenlalala.xyz/api/health || exit 1
          ENDSSH
```

**Step 3: Commit GitHub Actions workflow**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions workflow for automated VPS deployment"
```

---

## Task 10: Create Deployment Documentation

**Files:**
- Create: `DEPLOYMENT.md`

**Step 1: Create deployment documentation**

Create: `DEPLOYMENT.md`
```markdown
# Spotease Deployment Guide

This document describes how to deploy Spotease to your VPS.

## Prerequisites

- VPS with Ubuntu 20.04+ or Debian 11+
- Docker and Docker Compose installed
- Domain with DNS configured:
  - `spotease.rivenlalala.xyz` → VPS IP
  - `api.spotease.rivenlalala.xyz` → VPS IP
- GitHub repository with Actions enabled

## Initial VPS Setup

### 1. Install Docker

```bash
# SSH into VPS
ssh user@your-vps-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose plugin
apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 2. Clone Repository

```bash
# Create deployment directory
mkdir -p ~/spotease
cd ~/spotease

# Clone repository
git clone https://github.com/yourusername/spotease.git .
```

### 3. Generate SSL Certificates

```bash
# Create certificate directories
mkdir -p nginx/certbot/conf nginx/certbot/www

# Start temporary Nginx for ACME challenge
docker-compose -f docker-compose.certbot.yml up nginx-temp -d

# Generate certificates (replace email)
docker-compose -f docker-compose.certbot.yml run --rm certbot

# Stop temporary Nginx
docker-compose -f docker-compose.certbot.yml down
```

### 4. Configure Environment Variables

Create `.env` file in project root:

```bash
cat > .env << EOF
DB_USER=spotease_user
DB_PASSWORD=<generate-strong-password>
ENCRYPTION_KEY=<generate-32-character-key>
SPOTIFY_CLIENT_ID=<your-spotify-client-id>
SPOTIFY_CLIENT_SECRET=<your-spotify-client-secret>
NETEASE_API_URL=https://netease-api.rivenlalala.xyz
CORS_ALLOWED_ORIGINS=https://spotease.rivenlalala.xyz
EOF
```

**Generate secure values:**
```bash
# Database password
openssl rand -base64 24

# Encryption key (use first 32 characters)
openssl rand -base64 32
```

### 5. Start Application

```bash
# Build and start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f
```

### 6. Verify Deployment

```bash
# Check backend health
curl https://api.spotease.rivenlalala.xyz/api/health

# Check frontend
curl -I https://spotease.rivenlalala.xyz
```

## Configure GitHub Actions

### 1. Generate SSH Key for GitHub Actions

On your local machine:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions-spotease"
# Save to: ~/.ssh/spotease_deploy

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/spotease_deploy.pub user@vps-ip

# Copy private key content
cat ~/.ssh/spotease_deploy
# Copy the entire output
```

### 2. Add GitHub Secrets

Go to: GitHub repo → Settings → Secrets and variables → Actions

Add the following secrets:

| Secret Name | Value | How to Get |
|------------|-------|------------|
| `VPS_SSH_KEY` | Private key content | From `~/.ssh/spotease_deploy` |
| `VPS_USER` | SSH username | Your VPS username (e.g., `root`, `ubuntu`) |
| `VPS_HOST` | VPS IP or hostname | Your VPS IP address |
| `DB_USER` | Database username | e.g., `spotease_user` |
| `DB_PASSWORD` | Database password | Use `openssl rand -base64 24` |
| `ENCRYPTION_KEY` | 32-char encryption key | Use first 32 chars of `openssl rand -base64 32` |
| `SPOTIFY_CLIENT_ID` | Spotify client ID | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | Spotify client secret | From Spotify Developer Dashboard |

### 3. Configure Spotify OAuth

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create or edit your application
3. Add redirect URI: `https://api.spotease.rivenlalala.xyz/api/auth/spotify/callback`
4. Save changes

## Continuous Deployment

Once GitHub Actions is configured:

```bash
# Any push to main branch triggers deployment
git add .
git commit -m "feat: add new feature"
git push origin main

# GitHub Actions will:
# 1. SSH into VPS
# 2. Pull latest code
# 3. Create .env from secrets
# 4. Rebuild and restart containers
# 5. Verify deployment
```

## Local Development

### 1. Start PostgreSQL

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Start Backend

```bash
cd spotease-backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### 3. Start Frontend

```bash
cd spotease-frontend
npm run dev
```

Access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- PostgreSQL: localhost:5432

## Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Restart Services

```bash
# Restart specific service
docker-compose restart backend

# Restart all services
docker-compose restart
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

### Database Backup

```bash
# Create backup
docker exec spotease-postgres-1 pg_dump -U spotease_user spotease > backup-$(date +%Y%m%d).sql

# Restore backup
cat backup-20250128.sql | docker exec -i spotease-postgres-1 psql -U spotease_user spotease
```

### Rollback Deployment

```bash
# Via Git
git revert HEAD
git push origin main
# GitHub Actions will deploy reverted version

# Manual rollback
cd ~/spotease
git checkout <previous-commit-hash>
docker-compose up -d --build
```

## Troubleshooting

### SSL Certificate Issues

```bash
# Check DNS propagation
dig spotease.rivenlalala.xyz
dig api.spotease.rivenlalala.xyz

# Regenerate certificates
docker-compose -f docker-compose.certbot.yml up nginx-temp -d
docker-compose -f docker-compose.certbot.yml run --rm certbot
docker-compose -f docker-compose.certbot.yml down
docker-compose restart nginx
```

### Backend Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec backend ping postgres
```

### Frontend CORS Errors

```bash
# Verify CORS_ALLOWED_ORIGINS in .env
cat .env | grep CORS

# Restart backend
docker-compose restart backend
```

### WebSocket Connection Fails

```bash
# Check Nginx configuration
docker-compose exec nginx cat /etc/nginx/nginx.conf | grep -A 5 "WebSocket"

# Restart Nginx
docker-compose restart nginx
```

## Security Recommendations

```bash
# Configure firewall
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable

# Disable password authentication for SSH
# Edit /etc/ssh/sshd_config:
# PasswordAuthentication no
# PubkeyAuthentication yes

# Restart SSH
systemctl restart sshd

# Install fail2ban
apt install fail2ban
systemctl enable fail2ban
```

## Support

For issues or questions, please refer to:
- Main documentation: `docs/plans/2025-12-28-deployment-strategy.md`
- Repository issues: https://github.com/yourusername/spotease/issues
```

**Step 2: Commit deployment documentation**

```bash
git add DEPLOYMENT.md
git commit -m "docs: add comprehensive deployment guide"
```

---

## Task 11: Update Main README

**Files:**
- Modify: `README.md`

**Step 1: Check if README exists**

Run:
```bash
ls README.md
```

If file doesn't exist, create it. If it exists, append deployment section.

**Step 2: Add deployment section to README**

Add to end of `README.md`:
```markdown

## Deployment

Spotease can be deployed to a VPS using Docker Compose. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Quick Deploy

**Prerequisites:**
- VPS with Docker installed
- Domain configured
- GitHub Actions secrets configured

**Deploy:**
```bash
git push origin main
```

GitHub Actions automatically deploys to your VPS.

### Local Development

```bash
# Start PostgreSQL
docker-compose -f docker-compose.dev.yml up -d

# Start backend (in spotease-backend/)
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Start frontend (in spotease-frontend/)
npm run dev
```

**Environments:**
- Production: https://spotease.rivenlalala.xyz
- Production API: https://api.spotease.rivenlalala.xyz
- Local Frontend: http://localhost:5173
- Local Backend: http://localhost:8080
```

**Step 3: Commit README update**

```bash
git add README.md
git commit -m "docs: add deployment information to README"
```

---

## Final Checklist

Before considering deployment infrastructure complete, verify:

- [ ] Backend Dockerfile builds successfully
- [ ] Frontend Dockerfile builds successfully
- [ ] Docker Compose syntax is valid (`docker-compose config`)
- [ ] Development Docker Compose works (`docker-compose -f docker-compose.dev.yml up`)
- [ ] All environment files created (.env.example, application-dev.yml, frontend .env files)
- [ ] Backend CORS configuration is environment-aware
- [ ] GitHub Actions workflow is syntactically correct
- [ ] Nginx configurations are present (main and initial)
- [ ] DEPLOYMENT.md provides complete setup instructions
- [ ] README.md includes deployment section
- [ ] All files committed to git with clear commit messages

---

## Next Steps

After completing this implementation:

1. **VPS Setup** - Follow DEPLOYMENT.md to set up VPS infrastructure
2. **GitHub Secrets** - Configure all required secrets in GitHub repository
3. **DNS Configuration** - Point subdomains to VPS IP
4. **SSL Certificates** - Generate Let's Encrypt certificates on VPS
5. **First Deployment** - Push to main branch to trigger automated deployment
6. **Verification** - Test frontend and backend endpoints
7. **Monitoring** - Set up log monitoring and health checks

**Plan saved to:** `docs/plans/2025-12-28-deployment-implementation.md`
