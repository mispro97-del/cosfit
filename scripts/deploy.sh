#!/bin/bash
# ============================================================
# COSFIT - Production Deployment Script
# ============================================================
# Usage:
#   ./scripts/deploy.sh [migrate|seed|health]
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Pre-flight Checks ──

preflight() {
  log_info "Pre-flight checks..."

  if [ ! -f ".env.production.local" ] && [ -z "${DATABASE_URL:-}" ]; then
    log_error "Missing .env.production.local or DATABASE_URL environment variable"
    log_info "  cp .env.production .env.production.local"
    log_info "  # Then fill in actual values"
    exit 1
  fi

  if ! command -v npx &> /dev/null; then
    log_error "npx not found. Install Node.js first."
    exit 1
  fi

  log_ok "Pre-flight checks passed"
}

# ── DB Migration ──

migrate() {
  preflight
  log_info "Running database migration..."

  # Generate Prisma client
  npx prisma generate
  log_ok "Prisma client generated"

  # Deploy migrations (production-safe, no interactive prompts)
  npx prisma migrate deploy
  log_ok "Migrations applied successfully"

  # Verify schema
  npx prisma db pull --print 2>/dev/null | head -5
  log_ok "Schema verification complete"
}

# ── Seed Data ──

seed() {
  preflight
  log_info "Seeding database..."

  npx prisma generate
  npx tsx prisma/seed.ts
  log_ok "Seed data inserted"
}

# ── Health Check ──

health() {
  log_info "Running health checks..."

  # Check DB connection
  npx prisma db execute --stdin <<< "SELECT 1;" 2>/dev/null \
    && log_ok "Database: connected" \
    || log_error "Database: connection failed"

  # Check table counts
  log_info "Table row counts:"
  for table in users brands product_masters ingredients partners orders; do
    COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM $table;" 2>/dev/null | tail -1 || echo "?")
    echo "  $table: $COUNT"
  done

  # Check pending migrations
  PENDING=$(npx prisma migrate status 2>&1 | grep -c "not yet applied" || true)
  if [ "$PENDING" -gt 0 ]; then
    log_warn "Pending migrations: $PENDING"
  else
    log_ok "All migrations applied"
  fi
}

# ── Build ──

build() {
  log_info "Building for production..."

  npx prisma generate
  npm run build

  log_ok "Build completed"
  log_info "Start with: npm start"
}

# ── Main ──

case "${1:-}" in
  migrate)  migrate ;;
  seed)     seed ;;
  health)   health ;;
  build)    build ;;
  *)
    echo "COSFIT Deploy Script"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  migrate   Apply Prisma migrations to production DB"
    echo "  seed      Insert seed data"
    echo "  health    Check DB connection and table counts"
    echo "  build     Generate Prisma client and build Next.js"
    ;;
esac
