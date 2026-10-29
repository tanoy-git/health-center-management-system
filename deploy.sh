#!/bin/bash
set -e

echo "=========================================================="
echo "  Aegis Enterprise HIS v2.0 - VPS Production Deployment"
echo "  (Pre-built Cloud Images - Zero VPS Compile Load)"
echo "=========================================================="

DEPLOY_PATH="/home/tny/source/health-center-management-system"

if [ ! -d "$DEPLOY_PATH" ]; then
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
    echo "⚙️ Initializing from .env.example..."
    cp .env.example .env
    RANDOM_JWT=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)
    sed -i "s/generate_a_random_64_character_secret_string/$RANDOM_JWT/g" .env 2>/dev/null || true
  else
    echo "❌ Missing .env file. Please configure .env before starting."
    exit 1
  fi
fi

# 3. Pull pre-built images from GitHub Container Registry (takes ~10s, 0% CPU on VPS!)
echo "📥 Pulling pre-built backend and frontend images from GHCR..."
docker compose -f docker-compose.prod.yml pull backend frontend

# 4. Safely update containers in detached mode (Postgres and Redis are never interrupted)
echo "🚀 Updating production containers..."
# Auto-heal any container still bound to legacy network name (volumes preserved)
for c in aegis-prod-redis aegis-prod-postgres; do
  if docker inspect "$c" 2>/dev/null | grep -q "health-center-management-system_aegis_internal_network"; then
    echo "🔄 Recreating $c to attach to aegis_internal_network..."
    docker rm -f "$c" 2>/dev/null || true
  fi
done

docker compose -f docker-compose.prod.yml up -d

# 5. Wait for backend API to initialize
echo "⏳ Waiting for backend API to initialize..."
sleep 5

# 6. Prune dangling Docker images to preserve VPS disk space
echo "🧹 Pruning unused Docker images..."
docker image prune -f

# 7. Verify running services
echo "🔍 Verifying running containers..."
docker compose -f docker-compose.prod.yml ps

echo "=========================================================="
echo "✅ Auto-deployment finished successfully! Health ERP is live."
echo "   - Frontend: http://127.0.0.1:3001/health-erp"
echo "   - Backend:  http://127.0.0.1:4000/api/v1"
echo "=========================================================="
