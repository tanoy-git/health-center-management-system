#!/bin/bash
set -e

echo "=========================================================="
echo "  Aegis Enterprise HIS v2.0 - VPS Production Deployment"
echo "=========================================================="

DEPLOY_PATH="/home/tny/source/health-center-management-system"

# Ensure deploy directory exists
if [ ! -d "$DEPLOY_PATH" ]; then
  mkdir -p /home/tny/source
  DEPLOY_PATH="$(pwd)"
fi

cd "$DEPLOY_PATH" || exit 1

# 1. Fetch and reset to latest prod branch
echo "📥 Fetching latest updates from GitHub prod branch..."
git fetch origin prod
git reset --hard origin/prod

# 2. Check for production environment configuration (.env)
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo "⚠️  No .env found. Initializing from .env.example..."
    cp .env.example .env
    # Generate secure random secret for JWT
    RANDOM_JWT=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)
    sed -i "s/generate_a_random_64_character_secret_string/$RANDOM_JWT/g" .env 2>/dev/null || true
  else
    echo "❌ Missing .env file. Please configure .env before starting."
    exit 1
  fi
fi

# 3. Pull / Build and Launch Docker Containers
echo "🐳 Rebuilding and starting Docker production containers..."
docker compose -f docker-compose.prod.yml up -d --build --force-recreate --remove-orphans

# 4. Wait for database and backend readiness
echo "⏳ Waiting for backend API to initialize..."
sleep 5

# 5. Prune dangling Docker images to preserve VPS disk space
echo "🧹 Pruning unused Docker images..."
docker image prune -f

# 6. Verify services
echo "🔍 Verifying running containers..."
docker compose -f docker-compose.prod.yml ps

echo "=========================================================="
echo "✅ Auto-deployment finished successfully! Health ERP is live."
echo "   - Frontend: http://127.0.0.1:3001/health-erp"
echo "   - Backend:  http://127.0.0.1:4000/api/v1"
echo "=========================================================="

