# Spotease Deployment Checklist

Quick reference guide for deploying Spotease to production.

---

## Prerequisites Checklist

- [ ] VPS with Ubuntu 20.04+ or Debian 11+
- [ ] Root or sudo access to VPS
- [ ] Domain `spotease.rivenlalala.xyz` pointing to VPS IP
- [ ] Domain `api.spotease.rivenlalala.xyz` pointing to VPS IP
- [ ] GitHub repository with code pushed
- [ ] Spotify Developer Account (for OAuth credentials)

---

## Step 1: Prepare Your VPS

### 1.1 SSH into VPS
```bash
ssh user@your-vps-ip
```

### 1.2 Install Docker
```bash
# Download Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh

# Run installation
sh get-docker.sh

# Install Docker Compose plugin
apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 1.3 Clone Repository
```bash
# Create deployment directory
mkdir -p ~/spotease
cd ~/spotease

# Clone your repository (replace with your GitHub URL)
git clone https://github.com/yourusername/spotease.git .
```

---

## Step 2: Generate SSL Certificates

### 2.1 Create Certificate Directories
```bash
mkdir -p nginx/certbot/conf nginx/certbot/www
```

### 2.2 Start Temporary Nginx
```bash
docker-compose -f docker-compose.certbot.yml up nginx-temp -d
```

### 2.3 Generate Certificates
⚠️ **Important**: Replace `your-email@example.com` with your actual email!

```bash
# Edit the certbot command first:
nano docker-compose.certbot.yml
# Change: your-email@example.com → your-actual-email@example.com

# Generate certificates
docker-compose -f docker-compose.certbot.yml run --rm certbot
```

### 2.4 Stop Temporary Nginx
```bash
docker-compose -f docker-compose.certbot.yml down
```

---

## Step 3: Configure Environment Variables

### 3.1 Create Production .env File
```bash
nano .env
```

### 3.2 Fill in the Following Values

```bash
# Database Credentials
DB_USER=spotease_user
DB_PASSWORD=<GENERATE_STRONG_PASSWORD>

# Application Security (must be 32+ characters)
ENCRYPTION_KEY=<GENERATE_32_CHAR_KEY>

# Spotify OAuth (from Spotify Developer Dashboard)
SPOTIFY_CLIENT_ID=<YOUR_SPOTIFY_CLIENT_ID>
SPOTIFY_CLIENT_SECRET=<YOUR_SPOTIFY_CLIENT_SECRET>

# URLs
NETEASE_API_URL=https://netease-api.rivenlalala.xyz
SPOTIFY_REDIRECT_URI=https://api.spotease.rivenlalala.xyz/api/auth/spotify/callback
FRONTEND_URL=https://spotease.rivenlalala.xyz
```

### 3.3 Generate Secure Passwords and Keys
```bash
# Generate database password (copy the output)
openssl rand -base64 24

# Generate encryption key (copy first 32 characters)
openssl rand -base64 32 | head -c 32
```

Save `.env` file (Ctrl+X, Y, Enter)

---

## Step 4: Configure Spotify OAuth

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create or select your application
3. Click "Edit Settings"
4. Add Redirect URI: `https://api.spotease.rivenlalala.xyz/api/auth/spotify/callback`
5. Save changes
6. Copy Client ID and Client Secret to your `.env` file

---

## Step 5: Deploy Application

### 5.1 Build and Start All Services
```bash
docker-compose up -d --build
```

This will:
- Build backend and frontend Docker images
- Start PostgreSQL database
- Start backend API
- Start frontend web app
- Start Nginx reverse proxy
- Start Certbot certificate renewal service

### 5.2 Monitor Deployment
```bash
# Check all containers are running
docker-compose ps

# Watch logs (Ctrl+C to exit)
docker-compose logs -f

# Check specific service
docker-compose logs -f backend
```

---

## Step 6: Verify Deployment

### 6.1 Check Service Health
```bash
# Check backend health endpoint
curl https://api.spotease.rivenlalala.xyz/api/health

# Expected response: {"status":"UP"}

# Check frontend loads
curl -I https://spotease.rivenlalala.xyz

# Expected: HTTP/2 200
```

### 6.2 Test in Browser
1. Open https://spotease.rivenlalala.xyz
2. Verify page loads
3. Test Spotify authentication
4. Verify no CORS errors in browser console

---

## Step 7: Setup GitHub Actions (Automated Deployments)

### 7.1 Generate SSH Key for GitHub Actions
On your **local machine** (not VPS):

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions-spotease"

# Save to: ~/.ssh/spotease_deploy
# Press Enter for no passphrase

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/spotease_deploy.pub user@vps-ip

# Get private key content (copy entire output)
cat ~/.ssh/spotease_deploy
```

### 7.2 Add GitHub Secrets

Go to: **GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

Add these 8 secrets:

| Secret Name | Value | Where to Get |
|------------|-------|--------------|
| `VPS_SSH_KEY` | Private key content | Output from `cat ~/.ssh/spotease_deploy` |
| `VPS_USER` | SSH username | Your VPS username (e.g., `root`, `ubuntu`) |
| `VPS_HOST` | VPS IP address | Your VPS IP |
| `DB_USER` | Database username | From your VPS `.env` file |
| `DB_PASSWORD` | Database password | From your VPS `.env` file |
| `ENCRYPTION_KEY` | 32-char encryption key | From your VPS `.env` file |
| `SPOTIFY_CLIENT_ID` | Spotify client ID | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | Spotify client secret | From Spotify Developer Dashboard |

### 7.3 Test Automated Deployment

```bash
# Make a small change to trigger deployment
git commit --allow-empty -m "test: trigger deployment"
git push origin main

# Watch GitHub Actions tab in your repository
# Deployment should complete in 3-5 minutes
```

---

## Step 8: Secure Your VPS (Recommended)

### 8.1 Configure Firewall
```bash
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### 8.2 Disable SSH Password Authentication
```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Change these lines:
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH
systemctl restart sshd
```

### 8.3 Install fail2ban (Brute Force Protection)
```bash
apt install fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## Daily Operations

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
# Automated (just push to main)
git push origin main

# Manual
cd ~/spotease
git pull origin main
docker-compose up -d --build
```

### Database Backup
```bash
# Create backup
docker exec spotease-postgres pg_dump -U spotease_user spotease > backup-$(date +%Y%m%d).sql

# Restore from backup
cat backup-20250128.sql | docker exec -i spotease-postgres psql -U spotease_user spotease
```

---

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

### Backend Can't Connect to Database
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection from backend
docker-compose exec backend ping postgres
```

### Frontend Shows CORS Errors
```bash
# Verify environment variables
cat .env | grep CORS

# Restart backend
docker-compose restart backend
```

### Deployment Fails
```bash
# Check GitHub Actions logs in GitHub repository
# Check disk space on VPS
df -h

# Clean up Docker resources
docker system prune -f
```

---

## Quick Reference Commands

```bash
# Start stack
docker-compose up -d

# Stop stack
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Clean up
docker system prune -f
```

---

## Support

For detailed instructions, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [GitHub Issues](https://github.com/yourusername/spotease/issues) - Report problems

---

**Last Updated**: 2025-12-28
