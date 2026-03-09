#!/bin/sh
# ============================================================
# COSFIT - Container Startup Script
# 1. Resolve any previously failed migrations
# 2. DB migration (idempotent, safe to run on every start)
# 3. Start Next.js server
# ============================================================

set -e

PRISMA="node node_modules/prisma/build/index.js"

echo "[start.sh] Resolving any failed migrations..."
$PRISMA migrate resolve --rolled-back 20260307000000_fix_schema_mismatches 2>/dev/null && echo "[start.sh] Rolled back failed migration" || echo "[start.sh] No failed migration to resolve"

echo "[start.sh] Running DB migrations..."
$PRISMA migrate deploy && echo "[start.sh] Migrations OK" || echo "[start.sh] Migration warning (continuing)"

echo "[start.sh] Seeding admin user..."
node prisma/seed-admin.js 2>/dev/null || echo "[start.sh] Admin seed skipped"

echo "[start.sh] Starting Next.js server..."
exec node server.js
