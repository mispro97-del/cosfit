#!/bin/sh
# ============================================================
# COSFIT - Container Startup Script
# 1. DB migration (idempotent, safe to run on every start)
# 2. Start Next.js server
# ============================================================

set -e

echo "[start.sh] Running DB migrations..."
node node_modules/prisma/build/index.js migrate deploy && echo "[start.sh] Migrations OK" || echo "[start.sh] Migration warning (continuing)"

echo "[start.sh] Starting Next.js server..."
exec node server.js
