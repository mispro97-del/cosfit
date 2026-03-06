# COSFIT AWS 프로덕션 배포 가이드

## 아키텍처

```
 GitHub (main push)
       │
       ▼
 GitHub Actions CI/CD
   ├─ 1. Quality Gate (lint, type-check)
   ├─ 2. DB Migration (prisma migrate deploy → RDS)
   ├─ 3. Docker Build → ECR Push
   ├─ 4. App Runner Deploy
   └─ 5. Health Check (/api/health)
       │
       ▼
 AWS App Runner ──VPC Connector──▶ RDS PostgreSQL
       │                              │
       ├─ Secrets Manager             ├─ 자동 백업 7일
       ├─ CloudWatch Logs             └─ 암호화 (AES-256)
       └─ Auto Scaling (1~4)
       │
       ▼
 Route 53 → cosfit.kr (ACM SSL)
```

## 1단계: AWS 리소스 생성

### 필요 권한 (IAM)

| 역할 | 용도 | 정책 파일 |
|------|------|-----------|
| `cosfit-deployer` (IAM User) | CI/CD 배포 | `infra/policies/cicd-deploy-policy.json` |
| `cosfit-apprunner-ecr-access` (IAM Role) | ECR 이미지 풀 | AWS 관리형 정책 |
| `cosfit-apprunner-instance` (IAM Role) | 런타임 Secrets/S3 | `infra/policies/apprunner-instance-policy.json` |

### 보안 그룹

| 이름 | 인바운드 | 아웃바운드 | 용도 |
|------|---------|-----------|------|
| `cosfit-rds-sg` | TCP 5432 (동일 SG만) | All | RDS 접근 제한 |
| VPC Connector | - | TCP 5432 → RDS SG | App Runner → RDS |

RDS는 `no-publicly-accessible`로 설정하고, App Runner VPC Connector를 통해서만 접근합니다.

### 자동 설정

```bash
# AWS CLI 설정
aws configure --profile cosfit
export AWS_PROFILE=cosfit

# 1~3 자동 실행 (IAM + ECR + Secrets)
chmod +x infra/aws-setup.sh
./infra/aws-setup.sh all

# 4. RDS 생성 (interactive)
./infra/aws-setup.sh rds

# 5. VPC Connector 생성 (RDS 생성 완료 후)
./infra/aws-setup.sh vpc

# 6. App Runner 서비스 생성
./infra/aws-setup.sh apprunner
```

## 2단계: 환경 변수 설정

### Secrets Manager (민감 정보)

| Secret ID | 키 | 설명 |
|-----------|-----|------|
| `cosfit/prod/database` | `DATABASE_URL` | `postgresql://cosfitadmin:PASS@endpoint:5432/cosfit?schema=public&connection_limit=10` |
| | `DIRECT_URL` | `postgresql://cosfitadmin:PASS@endpoint:5432/cosfit?schema=public` |
| `cosfit/prod/auth` | `NEXTAUTH_SECRET` | `openssl rand -base64 32` 생성값 |
| | `NEXTAUTH_URL` | `https://cosfit.kr` |
| `cosfit/prod/api-keys` | `OPENAI_API_KEY` | `sk-...` |
| | `KFDA_API_KEY` | 식약처 공공데이터 API 키 |

### App Runner 환경 변수 (공개 설정)

| 변수 | 값 |
|------|-----|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOSTNAME` | `0.0.0.0` |
| `NEXT_PUBLIC_APP_NAME` | `COSFIT` |
| `NEXT_PUBLIC_APP_URL` | `https://cosfit.kr` |
| `NEXT_PUBLIC_API_BASE` | `/api/v1` |
| `COSFIT_AI_MODEL` | `gpt-4o` |
| `KFDA_API_BASE_URL` | `https://openapi.foodsafetykorea.go.kr/api` |

### GitHub Secrets

| Secret | 값 |
|--------|-----|
| `AWS_ACCESS_KEY_ID` | deployer Access Key |
| `AWS_SECRET_ACCESS_KEY` | deployer Secret Key |
| `AWS_ACCOUNT_ID` | 12자리 AWS 계정 ID |
| `APP_RUNNER_SERVICE_ARN` | `arn:aws:apprunner:ap-northeast-2:ACCOUNT:service/cosfit/...` |
| `DATABASE_URL` | RDS 연결 URL (마이그레이션용) |
| `DIRECT_URL` | RDS Direct URL |

### GitHub Variables

| Variable | 값 |
|----------|-----|
| `APP_URL` | `https://cosfit.kr` |
| `AWS_REGION` | `ap-northeast-2` |
| `ECR_REPOSITORY` | `cosfit` |

## 3단계: 첫 배포

```bash
# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.ap-northeast-2.amazonaws.com

# 수동 빌드 & 푸시 (첫 회만)
docker build -t cosfit .
docker tag cosfit:latest \
  ACCOUNT_ID.dkr.ecr.ap-northeast-2.amazonaws.com/cosfit:latest
docker push \
  ACCOUNT_ID.dkr.ecr.ap-northeast-2.amazonaws.com/cosfit:latest

# DB 마이그레이션
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

이후 `main` push 시 자동 배포됩니다.

## 4단계: 헬스 체크

```bash
# 서비스 상태 확인
curl https://cosfit.kr/api/health | jq

# 응답 예시
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": [
    { "name": "database", "status": "pass", "latencyMs": 3 },
    { "name": "memory", "status": "pass", "message": "128MB / 512MB" },
    { "name": "environment", "status": "pass" }
  ]
}
```

App Runner 헬스체크: `GET /api/health` (10초 간격, 5초 타임아웃, 3회 실패 시 재시작)

## CI/CD 파이프라인 상세

`main` push → 5단계 자동 실행:

1. **Quality Gate**: ESLint + TypeScript 검사
2. **DB Migration**: `prisma migrate status` → pending 시 `prisma migrate deploy`
3. **Docker Build**: multi-stage 빌드 → ECR push (GitHub Actions cache)
4. **App Runner Deploy**: 이미지 업데이트 → 롤링 배포 (~3분)
5. **Health Check**: `/api/health` 200 응답 확인 (5회 재시도)

긴급 배포: `workflow_dispatch` → `skip_tests: true`

## 비용 예측 (월간)

| 서비스 | 사양 | 비용 |
|--------|------|------|
| App Runner | 1 vCPU, 2GB, 1~4 인스턴스 | ~$25 |
| RDS PostgreSQL | db.t4g.micro, 20GB gp3 | ~$15 |
| ECR | 이미지 10개 | ~$1 |
| Secrets Manager | 시크릿 3개 | ~$2 |
| Route 53 | 1 hosted zone | ~$1 |
| **합계** | | **~$44/월** |
