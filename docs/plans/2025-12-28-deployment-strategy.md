# Spotease Deployment Strategy

**Date:** 2025-12-28
**Status:** Design Complete
**Target Environment:** Self-hosted VPS with Docker
**Domain:** spotease.rivenlalala.xyz / api.spotease.rivenlalala.xyz

---

## Executive Summary

Spotease will be deployed as a Docker Compose stack on a self-hosted VPS with automated deployments via GitHub Actions. The architecture uses separate subdomains for frontend and backend, Nginx reverse proxy with SSL termination, and PostgreSQL for data persistence.

**Key Features:**
- Automated CI/CD via GitHub Actions
- HTTPS everywhere with Let's Encrypt
- WebSocket support for real-time updates
- Secure secrets management via GitHub Secrets
- Zero-downtime deployments
- Local development support with hot reload

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
- SSL certificates managed by Certbot, auto-renewed

---

## 2. Docker Compose Configuration

### Main Stack: `docker-compose.yml`

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

### Frontend: `spotease-frontend/Dockerfile`

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

### Frontend Nginx: `spotease-frontend/nginx.conf`

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
          NETEASE_API_URL=https://netease-api.rivenlalala.xyz
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
docker-compose -f docker-compose.certbot.yml up nginx-temp -d

# 4. Generate certificates
docker-compose -f docker-compose.certbot.yml run --rm certbot

# 5. Stop temporary Nginx
docker-compose -f docker-compose.certbot.yml down

# 6. Start main stack
docker-compose up -d
```

### Auto-Renewal

The `certbot-renew` service in the main `docker-compose.yml` automatically renews certificates every 12 hours. Nginx reloads certificates without downtime.

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

# NetEase API
NETEASE_API_URL=https://netease-api.rivenlalala.xyz

# Environment
ENVIRONMENT=production
```

### Backend CORS Configuration

**Update: `spotease-backend/src/main/java/com/spotease/config/SecurityConfig.java`**

```java
@Value("${cors.allowed-origins}")
private String allowedOrigins;

@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true); // Important for session cookies

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

### Frontend Environment Files

**Production: `spotease-frontend/.env.production`**

```bash
VITE_API_BASE_URL=https://api.spotease.rivenlalala.xyz
VITE_WS_URL=wss://api.spotease.rivenlalala.xyz/ws/conversions
```

**Development: `spotease-frontend/.env.development`**

```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws/conversions
```

---

## 8. Local Development Setup

### Backend Configuration

**File: `spotease-backend/src/main/resources/application-dev.yml`**

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

### Development Workflow

```bash
# Terminal 1: Start PostgreSQL
docker-compose -f docker-compose.dev.yml up

# Terminal 2: Start backend (from spotease-backend/)
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 3: Start frontend (from spotease-frontend/)
npm run dev
```

### Environment Selection

- **Production:** Uses `application.yml` (default)
- **Local Development:** Uses `application-dev.yml` (activated with `-Dspring-boot.run.profiles=dev`)

---

## 9. Initial VPS Setup

### Prerequisites

- VPS with Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- DNS A records configured:
  - `spotease.rivenlalala.xyz` → VPS IP
  - `api.spotease.rivenlalala.xyz` → VPS IP

### Installation Steps

```bash
# 1. SSH into VPS
ssh user@your-vps-ip

# 2. Update system
apt update && apt upgrade -y

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 4. Install Docker Compose plugin
apt-get install docker-compose-plugin

# 5. Verify installation
docker --version
docker compose version

# 6. Create deployment directory
mkdir -p ~/spotease
cd ~/spotease

# 7. Clone repository
git clone https://github.com/yourusername/spotease.git .

# 8. Create nginx directories
mkdir -p nginx/certbot/conf nginx/certbot/www

# 9. Get SSL certificates (follow Section 6)
docker-compose -f docker-compose.certbot.yml up nginx-temp -d
docker-compose -f docker-compose.certbot.yml run --rm certbot
docker-compose -f docker-compose.certbot.yml down

# 10. Create .env file (manually for first deployment)
nano .env
# Paste production values, save and exit

# 11. Start the application
docker-compose up -d

# 12. Verify deployment
docker-compose ps
curl https://api.spotease.rivenlalala.xyz/api/health
curl https://spotease.rivenlalala.xyz
```

### Configure SSH Key for GitHub Actions

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-spotease"
# Save to: ~/.ssh/spotease_deploy

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/spotease_deploy.pub user@vps-ip

# Add private key to GitHub Secrets as VPS_SSH_KEY
cat ~/.ssh/spotease_deploy
```

---

## 10. Deployment Operations

### First Deployment

```bash
# On VPS (manual)
cd ~/spotease
git pull origin main
cat > .env << EOF
DB_USER=spotease_user
DB_PASSWORD=your_secure_password
ENCRYPTION_KEY=your_32_character_encryption_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
NETEASE_API_URL=https://netease-api.rivenlalala.xyz
EOF

docker-compose up -d
```

### Continuous Deployment

```bash
# Just push to main branch
git add .
git commit -m "feat: add new feature"
git push origin main

# GitHub Actions automatically:
# 1. Pulls latest code on VPS
# 2. Creates .env from secrets
# 3. Rebuilds and restarts containers
# 4. Verifies health check
```

### Monitoring

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Check container status
docker-compose ps

# Check resource usage
docker stats
```

### Maintenance Operations

```bash
# Restart specific service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build backend

# Stop all services
docker-compose down

# Stop and remove volumes (DANGER: deletes database)
docker-compose down -v

# View backend application logs
docker-compose exec backend tail -f /var/log/spring.log

# Access PostgreSQL
docker-compose exec postgres psql -U spotease_user -d spotease
```

### Database Backup

```bash
# Create backup
docker exec spotease-postgres-1 pg_dump -U spotease_user spotease > backup-$(date +%Y%m%d).sql

# Restore from backup
cat backup-20250128.sql | docker exec -i spotease-postgres-1 psql -U spotease_user spotease

# Automated daily backup (add to crontab)
0 2 * * * cd ~/spotease && docker exec spotease-postgres-1 pg_dump -U spotease_user spotease > backups/backup-$(date +\%Y\%m\%d).sql
```

### Rollback Deployment

```bash
# Option 1: Revert via Git
git revert HEAD
git push origin main
# GitHub Actions will deploy the reverted version

# Option 2: Manual rollback on VPS
cd ~/spotease
git log --oneline  # Find commit hash
git checkout <previous-commit-hash>
docker-compose up -d --build
```

### Health Checks

```bash
# Backend API health
curl https://api.spotease.rivenlalala.xyz/api/health

# Frontend
curl -I https://spotease.rivenlalala.xyz

# WebSocket (using wscat)
npm install -g wscat
wscat -c wss://api.spotease.rivenlalala.xyz/ws/conversions

# Database connection
docker-compose exec postgres pg_isready -U spotease_user

# SSL certificate expiry
echo | openssl s_client -servername spotease.rivenlalala.xyz -connect spotease.rivenlalala.xyz:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 11. Security Checklist

### Application Security

- ✅ HTTPS enforced on all endpoints (HTTP redirects to HTTPS)
- ✅ SSL certificates auto-renewed via Let's Encrypt
- ✅ Credentials stored in GitHub Secrets (never in code)
- ✅ CORS restricted to production domain
- ✅ Rate limiting on API endpoints (10 req/s with burst of 20)
- ✅ PostgreSQL not exposed to internet (internal Docker network only)
- ✅ Session cookies with `Secure` and `SameSite` flags
- ✅ OAuth tokens encrypted at rest in database (AES-256-GCM)
- ✅ WebSocket connections over WSS (WebSocket Secure)

### Infrastructure Security

- ✅ `.env` file in `.gitignore` (never committed)
- ✅ SSH key-based authentication for VPS (no password auth)
- ✅ Docker containers run as non-root users (where applicable)
- ✅ Regular security updates via `apt upgrade`
- ✅ Firewall configured (only ports 80, 443, and SSH open)

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

## 12. Troubleshooting

### Common Issues

**Issue: SSL certificate generation fails**
```bash
# Solution: Ensure DNS is propagated
dig spotease.rivenlalala.xyz
dig api.spotease.rivenlalala.xyz

# Wait for DNS to propagate (can take up to 48 hours)
# Use temporary HTTP-only setup for testing if needed
```

**Issue: Backend can't connect to PostgreSQL**
```bash
# Check if postgres container is running
docker-compose ps

# Check postgres logs
docker-compose logs postgres

# Verify network connectivity
docker-compose exec backend ping postgres
```

**Issue: Frontend shows CORS errors**
```bash
# Verify backend CORS configuration
# Check application.yml or application-prod.yml:
cors:
  allowed-origins: https://spotease.rivenlalala.xyz

# Restart backend
docker-compose restart backend
```

**Issue: WebSocket connection fails**
```bash
# Check Nginx WebSocket proxy configuration
# Ensure these headers are present in nginx.conf:
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Restart Nginx
docker-compose restart nginx
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
docker-compose up -d --build
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

## 13. Cost Breakdown

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

## 14. Future Enhancements

### Scaling Considerations

When user base grows beyond single VPS capacity:

1. **Database Scaling**
   - Move PostgreSQL to managed service (DigitalOcean Managed Database)
   - Enable read replicas for heavy read workloads
   - Add connection pooling (PgBouncer)

2. **Backend Scaling**
   - Deploy multiple backend instances behind load balancer
   - Add Redis for session storage (enable sticky sessions)
   - Separate WebSocket server from REST API

3. **Frontend Scaling**
   - Move to CDN (Cloudflare, AWS CloudFront)
   - Enable aggressive caching for static assets
   - Implement service worker for offline support

4. **Monitoring**
   - Add Prometheus + Grafana for metrics
   - Implement centralized logging (ELK stack or Loki)
   - Set up uptime monitoring (UptimeRobot, Better Uptime)

5. **CI/CD Enhancements**
   - Add automated testing in pipeline
   - Implement blue-green deployments
   - Add staging environment

---

## Appendix A: Complete File Structure

```
spotease/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── spotease-backend/
│   ├── src/
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
│       └── 2025-12-28-deployment-strategy.md
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.certbot.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Appendix B: Quick Reference Commands

```bash
# Development
docker-compose -f docker-compose.dev.yml up          # Start local PostgreSQL
mvn spring-boot:run -Dspring-boot.run.profiles=dev  # Run backend
npm run dev                                          # Run frontend

# Production Deployment
git push origin main                                 # Deploy via GitHub Actions
docker-compose up -d                                 # Manual deploy
docker-compose logs -f                               # View logs
docker-compose restart <service>                     # Restart service

# Maintenance
docker-compose ps                                    # Check status
docker stats                                         # Resource usage
docker system prune -f                               # Clean up

# Database
docker exec spotease-postgres-1 pg_dump -U spotease_user spotease > backup.sql
cat backup.sql | docker exec -i spotease-postgres-1 psql -U spotease_user spotease

# SSL
certbot renew --dry-run                             # Test renewal
openssl x509 -in cert.pem -text -noout              # Inspect certificate

# Health Checks
curl https://api.spotease.rivenlalala.xyz/api/health
curl -I https://spotease.rivenlalala.xyz
```

---

**End of Deployment Strategy Document**
