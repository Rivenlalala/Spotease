# Spotease

Bidirectional playlist conversion between Spotify and NetEase Music platforms.

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
