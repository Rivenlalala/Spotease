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
