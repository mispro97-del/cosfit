#!/bin/bash
# ============================================================
# COSFIT - AWS 자동 배포 원클릭 부트스트랩
# ============================================================
# 이 스크립트를 한 번 실행하면 이후 GitHub push만으로
# 자동 배포가 작동합니다.
#
# 사전 조건:
#   1. AWS CLI 설치 + 계정 설정 (aws configure)
#   2. Docker 설치
#   3. GitHub CLI 설치 (gh auth login)
#
# Usage: ./scripts/bootstrap-aws.sh
# ============================================================

set -euo pipefail

REGION="ap-northeast-1"
PROJECT="cosfit"
REPO_FULL=""  # 자동 감지

R='\033[0;31m'; G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; C='\033[0;36m'; N='\033[0m'; BOLD='\033[1m'

step()  { echo -e "\n${B}━━━ $1 ━━━${N}"; }
ok()    { echo -e "  ${G}✓${N} $1"; }
fail()  { echo -e "  ${R}✗${N} $1"; exit 1; }
warn()  { echo -e "  ${Y}!${N} $1"; }
info()  { echo -e "  ${C}→${N} $1"; }

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Pre-flight checks
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

step "0/7  사전 요구사항 확인"

command -v aws   >/dev/null 2>&1 || fail "AWS CLI가 필요합니다: brew install awscli"
command -v docker >/dev/null 2>&1 || fail "Docker가 필요합니다: https://docker.com"
command -v gh    >/dev/null 2>&1 || fail "GitHub CLI가 필요합니다: brew install gh"
command -v node  >/dev/null 2>&1 || fail "Node.js가 필요합니다"
command -v npx   >/dev/null 2>&1 || fail "npx가 필요합니다"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) || fail "AWS 인증 실패. aws configure를 먼저 실행하세요."
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# GitHub repo 감지
REPO_FULL=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$REPO_FULL" ]; then
  warn "GitHub 리포지토리를 감지할 수 없습니다."
  read -p "  GitHub repo (owner/name): " REPO_FULL
fi

ok "AWS Account: ${ACCOUNT_ID}"
ok "GitHub Repo: ${REPO_FULL}"
ok "Region: ${REGION}"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. IAM 배포 사용자
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

step "1/7  IAM 배포 사용자 생성"

aws iam create-user --user-name ${PROJECT}-deployer 2>/dev/null && ok "User 생성" || ok "User 이미 존재"

aws iam put-user-policy \
  --user-name ${PROJECT}-deployer \
  --policy-name ${PROJECT}-deploy \
  --policy-document file://infra/policies/cicd-deploy-policy.json 2>/dev/null
ok "배포 정책 부착"

# Access Key 생성
KEY_JSON=$(aws iam create-access-key --user-name ${PROJECT}-deployer --output json 2>/dev/null || echo "")
if [ -n "$KEY_JSON" ]; then
  AWS_AK=$(echo "$KEY_JSON" | jq -r '.AccessKey.AccessKeyId')
  AWS_SK=$(echo "$KEY_JSON" | jq -r '.AccessKey.SecretAccessKey')
  ok "Access Key 생성: ${AWS_AK}"
else
  warn "Access Key가 이미 존재합니다. 기존 키를 사용하세요."
  AWS_AK=""
  AWS_SK=""
fi

# App Runner roles
for TRUST_SVC in "build.apprunner.amazonaws.com" "tasks.apprunner.amazonaws.com"; do
  ROLE_SUFFIX=$([ "$TRUST_SVC" = "build.apprunner.amazonaws.com" ] && echo "ecr-access" || echo "instance")
  ROLE_NAME="${PROJECT}-apprunner-${ROLE_SUFFIX}"

  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"${TRUST_SVC}\"},\"Action\":\"sts:AssumeRole\"}]}" \
    2>/dev/null && ok "Role: ${ROLE_NAME}" || ok "Role 존재: ${ROLE_NAME}"
done

aws iam attach-role-policy \
  --role-name ${PROJECT}-apprunner-ecr-access \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess 2>/dev/null || true

aws iam put-role-policy \
  --role-name ${PROJECT}-apprunner-instance \
  --policy-name ${PROJECT}-instance \
  --policy-document file://infra/policies/apprunner-instance-policy.json 2>/dev/null || true

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. ECR
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

step "2/7  ECR 레포지터리 생성"

aws ecr create-repository \
  --repository-name "$PROJECT" \
  --region "$REGION" \
  --image-scanning-configuration scanOnPush=true \
  2>/dev/null && ok "ECR: ${PROJECT}" || ok "ECR 이미 존재"

aws ecr put-lifecycle-policy \
  --repository-name "$PROJECT" \
  --lifecycle-policy-text '{"rules":[{"rulePriority":1,"selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":10},"action":{"type":"expire"}}]}' \
  --region "$REGION" >/dev/null 2>&1
ok "Lifecycle: 최근 10개만 유지"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. RDS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

step "3/7  RDS PostgreSQL 생성"

RDS_EXIST=$(aws rds describe-db-instances \
  --db-instance-identifier ${PROJECT}-db \
  --query "DBInstances[0].DBInstanceIdentifier" \
  --output text --region "$REGION" 2>/dev/null || echo "NONE")

if [ "$RDS_EXIST" = "NONE" ]; then
  DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)

  # 보안 그룹
  VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
    --query "Vpcs[0].VpcId" --output text --region "$REGION")

  SG_ID=$(aws ec2 create-security-group \
    --group-name "${PROJECT}-rds-sg" \
    --description "COSFIT RDS" --vpc-id "$VPC_ID" \
    --query "GroupId" --output text --region "$REGION" 2>/dev/null || \
    aws ec2 describe-security-groups --filters "Name=group-name,Values=${PROJECT}-rds-sg" \
    --query "SecurityGroups[0].GroupId" --output text --region "$REGION")

  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" --protocol tcp --port 5432 --source-group "$SG_ID" \
    --region "$REGION" 2>/dev/null || true

  # Subnet group
  SUBNETS=$(aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" \
    --query "Subnets[].SubnetId" --output text --region "$REGION" | tr '\t' ' ')

  aws rds create-db-subnet-group \
    --db-subnet-group-name "${PROJECT}-subnets" \
    --db-subnet-group-description "COSFIT" \
    --subnet-ids $SUBNETS --region "$REGION" 2>/dev/null || true

  aws rds create-db-instance \
    --db-instance-identifier "${PROJECT}-db" \
    --db-instance-class db.t4g.micro --engine postgres --engine-version "16" \
    --master-username "${PROJECT}admin" --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 --max-allocated-storage 100 --storage-type gp3 \
    --db-name cosfit --db-subnet-group-name "${PROJECT}-subnets" \
    --vpc-security-group-ids "$SG_ID" --backup-retention-period 7 \
    --storage-encrypted --deletion-protection --no-publicly-accessible \
    --region "$REGION" >/dev/null 2>&1

  ok "RDS 생성 중... (5~10분 소요)"
  info "비밀번호: ${DB_PASSWORD}"
  warn "이 비밀번호를 반드시 저장하세요!"

  info "RDS 준비 대기 중..."
  aws rds wait db-instance-available \
    --db-instance-identifier ${PROJECT}-db --region "$REGION" 2>/dev/null || true

  RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier ${PROJECT}-db \
    --query "DBInstances[0].Endpoint.Address" \
    --output text --region "$REGION" 2>/dev/null || echo "pending")

  ok "RDS 엔드포인트: ${RDS_ENDPOINT}"
  DATABASE_URL="postgresql://${PROJECT}admin:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/cosfit?schema=public"
  DIRECT_URL="$DATABASE_URL"
else
  ok "RDS 이미 존재"
  RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier ${PROJECT}-db \
    --query "DBInstances[0].Endpoint.Address" \
    --output text --region "$REGION")
  info "Endpoint: ${RDS_ENDPOINT}"
  DATABASE_URL="(기존 URL 사용)"
  DIRECT_URL="(기존 URL 사용)"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. Secrets Manager
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

step "4/7  Secrets Manager 설정"

NEXTAUTH_SECRET=$(openssl rand -base64 32)

aws secretsmanager create-secret --name "${PROJECT}/prod/database" \
  --secret-string "{\"DATABASE_URL\":\"${DATABASE_URL}&connection_limit=10\",\"DIRECT_URL\":\"${DIRECT_URL}\"}" \
  --region "$REGION" 2>/dev/null && ok "Secret: database" || ok "Secret 존재: database"

aws secretsmanager create-secret --name "${PROJECT}/prod/auth" \
  --secret-string "{\"NEXTAUTH_SECRET\":\"${NEXTAUTH_SECRET}\",\"NEXTAUTH_URL\":\"https://cosfit.kr\"}" \
  --region "$REGION" 2>/dev/null && ok "Secret: auth" || ok "Secret 존재: auth"

aws secretsmanager create-secret --name "${PROJECT}/prod/api-keys" \
  --secret-string '{"OPENAI_API_KEY":"","KFDA_API_KEY":""}' \
  --region "$REGION" 2>/dev/null && ok "Secret: api-keys" || ok "Secret 존재: api-keys"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. VPC Connector + App Runner
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

step "5/7  VPC Connector + App Runner"

SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=${PROJECT}-rds-sg" \
  --query "SecurityGroups[0].GroupId" --output text --region "$REGION" 2>/dev/null || echo "")

SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" \
  --query "Subnets[:2].SubnetId" --output text --region "$REGION" | tr '\t' ' ')

if [ -n "$SG_ID" ]; then
  aws apprunner create-vpc-connector \
    --vpc-connector-name "${PROJECT}-vpc" \
    --subnets $SUBNET_IDS \
    --security-groups "$SG_ID" \
    --region "$REGION" 2>/dev/null && ok "VPC Connector 생성" || ok "VPC Connector 존재"
fi

# 첫 이미지 빌드 & 푸시
info "첫 Docker 이미지 빌드 중..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${ECR_REGISTRY}" 2>/dev/null
docker build -t "${PROJECT}:latest" . 2>/dev/null
docker tag "${PROJECT}:latest" "${ECR_REGISTRY}/${PROJECT}:latest"
docker push "${ECR_REGISTRY}/${PROJECT}:latest" 2>/dev/null
ok "ECR에 이미지 푸시 완료"

# App Runner 생성
sed "s/ACCOUNT_ID/${ACCOUNT_ID}/g" infra/apprunner-service.json > /tmp/ar-config.json

APP_RUNNER_ARN=$(aws apprunner create-service \
  --cli-input-json file:///tmp/ar-config.json \
  --region "$REGION" \
  --query "Service.ServiceArn" --output text 2>/dev/null || \
  aws apprunner list-services --region "$REGION" \
    --query "ServiceSummaryList[?ServiceName=='${PROJECT}'].ServiceArn | [0]" --output text 2>/dev/null || echo "")

if [ -n "$APP_RUNNER_ARN" ] && [ "$APP_RUNNER_ARN" != "None" ]; then
  ok "App Runner: ${APP_RUNNER_ARN}"
else
  warn "App Runner 생성 확인 필요"
  APP_RUNNER_ARN="(콘솔에서 확인)"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. DB 마이그레이션
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

step "6/7  DB 마이그레이션"

if [ "$DATABASE_URL" != "(기존 URL 사용)" ]; then
  npm ci --silent 2>/dev/null
  DATABASE_URL="$DATABASE_URL" DIRECT_URL="$DIRECT_URL" npx prisma migrate deploy 2>/dev/null \
    && ok "마이그레이션 완료" || warn "마이그레이션 실패 (RDS가 아직 준비 중일 수 있음)"
else
  warn "DATABASE_URL을 수동 설정 후 npx prisma migrate deploy를 실행하세요"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. GitHub Secrets 자동 등록
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

step "7/7  GitHub Secrets 등록"

if [ -n "$AWS_AK" ] && [ -n "$REPO_FULL" ]; then
  gh secret set AWS_ACCESS_KEY_ID     -b "$AWS_AK"     --repo "$REPO_FULL" 2>/dev/null && ok "AWS_ACCESS_KEY_ID" || warn "설정 실패"
  gh secret set AWS_SECRET_ACCESS_KEY -b "$AWS_SK"     --repo "$REPO_FULL" 2>/dev/null && ok "AWS_SECRET_ACCESS_KEY" || warn "설정 실패"
  gh secret set AWS_ACCOUNT_ID        -b "$ACCOUNT_ID" --repo "$REPO_FULL" 2>/dev/null && ok "AWS_ACCOUNT_ID" || warn "설정 실패"

  if [ -n "$APP_RUNNER_ARN" ] && [ "$APP_RUNNER_ARN" != "(콘솔에서 확인)" ]; then
    gh secret set APP_RUNNER_SERVICE_ARN -b "$APP_RUNNER_ARN" --repo "$REPO_FULL" 2>/dev/null && ok "APP_RUNNER_SERVICE_ARN" || warn "설정 실패"
  fi

  if [ "$DATABASE_URL" != "(기존 URL 사용)" ]; then
    gh secret set DATABASE_URL -b "$DATABASE_URL" --repo "$REPO_FULL" 2>/dev/null && ok "DATABASE_URL" || warn "설정 실패"
    gh secret set DIRECT_URL   -b "$DIRECT_URL"   --repo "$REPO_FULL" 2>/dev/null && ok "DIRECT_URL" || warn "설정 실패"
  fi

  # Variables
  gh variable set APP_URL        -b "https://cosfit.kr" --repo "$REPO_FULL" 2>/dev/null || true
  gh variable set AWS_REGION     -b "$REGION"           --repo "$REPO_FULL" 2>/dev/null || true
  gh variable set ECR_REPOSITORY -b "$PROJECT"          --repo "$REPO_FULL" 2>/dev/null || true
  ok "GitHub Variables 설정 완료"
else
  warn "GitHub Secrets를 수동으로 설정하세요"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Done
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo ""
echo -e "${G}${BOLD}════════════════════════════════════════════════════════════${N}"
echo -e "${G}${BOLD}  ✅ 부트스트랩 완료!${N}"
echo -e "${G}${BOLD}════════════════════════════════════════════════════════════${N}"
echo ""
echo -e "  이제 ${BOLD}git push origin main${N} 만 하면 자동으로:"
echo ""
echo "    1. ESLint + TypeScript 검사"
echo "    2. Prisma DB 마이그레이션"
echo "    3. Docker 빌드 → ECR 푸시"
echo "    4. App Runner 자동 배포"
echo "    5. /api/health 헬스 체크"
echo ""
echo "  🌐 서비스 URL: App Runner 콘솔에서 확인"
echo "  🏥 헬스 체크:  curl https://YOUR_URL/api/health"
echo ""

if [ "$DATABASE_URL" = "(기존 URL 사용)" ]; then
  echo -e "  ${Y}⚠️  수동 작업 필요:${N}"
  echo "    1. GitHub Secrets에 DATABASE_URL, DIRECT_URL 등록"
  echo "    2. npx prisma migrate deploy 실행"
  echo ""
fi
