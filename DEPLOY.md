# COSFIT 배포 가이드

## Quick Start

```bash
# 1. 환경 변수 설정
cp .env.production .env.production.local
# .env.production.local에 실제 값 입력

# 2. DB 마이그레이션
npm run deploy:migrate

# 3. 빌드 & 시작
npm run build
npm start
```

## Vercel 배포

```bash
# 1. Vercel CLI
npm i -g vercel
vercel login

# 2. 프로젝트 연결
vercel link

# 3. 환경 변수 설정 (Vercel Dashboard > Settings > Environment Variables)
#    필수: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 4. 배포
vercel --prod
```

### GitHub 연동 자동 배포

GitHub Secrets 추가:
- `VERCEL_TOKEN`: Vercel Access Token
- `VERCEL_ORG_ID`: Vercel 조직 ID
- `VERCEL_PROJECT_ID`: Vercel 프로젝트 ID
- `DATABASE_URL`: 운영 DB URL
- `DIRECT_URL`: Direct DB URL (마이그레이션용)

`main` 브랜치 push 시 자동으로:
1. Lint + TypeCheck + Test
2. DB Migration
3. Vercel Production Deploy

## Docker 배포

```bash
docker build -t cosfit .
docker run -p 3000:3000 --env-file .env.production.local cosfit
```

## DB 마이그레이션

```bash
# 상태 확인
npx prisma migrate status

# 운영 DB 적용 (비대화식)
npx prisma migrate deploy

# 개발 환경 마이그레이션 생성
npx prisma migrate dev --name add_feature_x
```

## 헬스체크

```bash
npm run deploy:health
```
