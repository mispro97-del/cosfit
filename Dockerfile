# ============================================================
# COSFIT - AWS Production Dockerfile
# ============================================================
# Targets: AWS App Runner / ECS Fargate / ECR
#
# Build:  docker build -t cosfit:latest .
# Run:    docker run -p 3000:3000 --env-file .env.production.local cosfit:latest
# Push:   docker tag cosfit:latest <account>.dkr.ecr.ap-northeast-1.amazonaws.com/cosfit:latest
#         docker push <account>.dkr.ecr.ap-northeast-1.amazonaws.com/cosfit:latest
#
# Multi-stage 빌드로 최종 이미지 ~150MB (node_modules 제거)
# ============================================================

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Stage 1: Install dependencies
# - package*.json만 먼저 복사하여 레이어 캐시 활용
# - npm ci --ignore-scripts 로 postinstall 건너뛰기
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# 의존성 캐시 레이어: 이 파일이 변경될 때만 npm ci 재실행
COPY package.json package-lock.json* ./
COPY prisma/schema.prisma ./prisma/schema.prisma

RUN npm ci --ignore-scripts \
    && npx prisma generate

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Stage 2: Build application
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드 시 필요한 환경변수 (런타임 값 아님, 빌드 통과용)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# DB URL은 빌드 시 사용되지 않지만 Prisma client 생성에 필요
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN npm run build

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Stage 3: Production runtime
# - standalone output만 복사 (node_modules 미포함)
# - non-root user로 실행
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat openssl curl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 보안: non-root 사용자
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# 정적 파일
COPY --from=builder /app/public ./public

# standalone 빌드 출력 (server.js + minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma 엔진 (런타임에 DB 연결 필요)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

# AWS 헬스체크용
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
