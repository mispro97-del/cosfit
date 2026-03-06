#!/bin/bash
# ============================================================
# COSFIT - AWS Infrastructure Setup
# ============================================================
# Usage: ./infra/aws-setup.sh [command]
# Commands: iam | ecr | rds | vpc | secrets | apprunner | all
# ============================================================

set -euo pipefail

REGION="${AWS_REGION:-ap-northeast-1}"
PROJECT="cosfit"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "UNKNOWN")

G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
log() { echo -e "${B}[$PROJECT]${N} $1"; }
ok()  { echo -e "  ${G}✓${N} $1"; }
warn(){ echo -e "  ${Y}!${N} $1"; }

# ── 1. IAM Roles & Policies ──

setup_iam() {
  log "Creating IAM roles and policies..."

  # CI/CD Deploy User
  aws iam create-user --user-name ${PROJECT}-deployer 2>/dev/null && ok "User: ${PROJECT}-deployer" || warn "User exists"

  aws iam put-user-policy \
    --user-name ${PROJECT}-deployer \
    --policy-name ${PROJECT}-deploy-policy \
    --policy-document file://infra/policies/cicd-deploy-policy.json 2>/dev/null \
    && ok "Deploy policy attached" || warn "Policy exists"

  # App Runner ECR Access Role (for pulling images)
  cat > /tmp/apprunner-trust.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "build.apprunner.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

  aws iam create-role \
    --role-name ${PROJECT}-apprunner-ecr-access \
    --assume-role-policy-document file:///tmp/apprunner-trust.json 2>/dev/null \
    && ok "ECR access role created" || warn "Role exists"

  aws iam attach-role-policy \
    --role-name ${PROJECT}-apprunner-ecr-access \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess 2>/dev/null || true

  # App Runner Instance Role (runtime permissions)
  cat > /tmp/instance-trust.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "tasks.apprunner.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

  aws iam create-role \
    --role-name ${PROJECT}-apprunner-instance \
    --assume-role-policy-document file:///tmp/instance-trust.json 2>/dev/null \
    && ok "Instance role created" || warn "Role exists"

  aws iam put-role-policy \
    --role-name ${PROJECT}-apprunner-instance \
    --policy-name ${PROJECT}-instance-policy \
    --policy-document file://infra/policies/apprunner-instance-policy.json 2>/dev/null \
    && ok "Instance policy attached" || warn "Policy exists"

  echo ""
  echo "  📋 CI/CD Access Key 생성:"
  echo "     aws iam create-access-key --user-name ${PROJECT}-deployer"
  echo "     → GitHub Secrets에 AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY 등록"
}

# ── 2. ECR Repository ──

setup_ecr() {
  log "Creating ECR repository..."

  aws ecr create-repository \
    --repository-name "$PROJECT" \
    --region "$REGION" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    2>/dev/null && ok "ECR: $PROJECT" || warn "ECR exists"

  aws ecr put-lifecycle-policy \
    --repository-name "$PROJECT" \
    --region "$REGION" \
    --lifecycle-policy-text '{
      "rules": [{"rulePriority":1,"description":"Keep 10","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":10},"action":{"type":"expire"}}]
    }' >/dev/null 2>&1 && ok "Lifecycle: keep last 10"

  echo "  📦 Registry: ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT}"
}

# ── 3. RDS PostgreSQL ──

setup_rds() {
  log "Creating RDS PostgreSQL..."
  warn "This creates db.t4g.micro (~\$15/month). Continue? (y/N)"
  read -r confirm; [[ "$confirm" != "y" ]] && return

  # Default VPC subnets
  SUBNETS=$(aws ec2 describe-subnets \
    --filters "Name=default-for-az,Values=true" \
    --query "Subnets[].SubnetId" --output text --region "$REGION" | tr '\t' ' ')

  aws rds create-db-subnet-group \
    --db-subnet-group-name "${PROJECT}-db-subnets" \
    --db-subnet-group-description "COSFIT DB" \
    --subnet-ids $SUBNETS \
    --region "$REGION" 2>/dev/null || true

  # Security Group
  VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
    --query "Vpcs[0].VpcId" --output text --region "$REGION")

  SG_ID=$(aws ec2 create-security-group \
    --group-name "${PROJECT}-rds-sg" \
    --description "COSFIT RDS - PostgreSQL 5432" \
    --vpc-id "$VPC_ID" \
    --query "GroupId" --output text --region "$REGION" 2>/dev/null || \
    aws ec2 describe-security-groups \
      --filters "Name=group-name,Values=${PROJECT}-rds-sg" \
      --query "SecurityGroups[0].GroupId" --output text --region "$REGION")

  # App Runner VPC Connector SG도 허용
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 5432 --source-group "$SG_ID" \
    --region "$REGION" 2>/dev/null || true

  DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)

  aws rds create-db-instance \
    --db-instance-identifier "${PROJECT}-db" \
    --db-instance-class db.t4g.micro \
    --engine postgres --engine-version "16" \
    --master-username "${PROJECT}admin" \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 --max-allocated-storage 100 --storage-type gp3 \
    --db-name cosfit \
    --db-subnet-group-name "${PROJECT}-db-subnets" \
    --vpc-security-group-ids "$SG_ID" \
    --backup-retention-period 7 \
    --storage-encrypted --deletion-protection \
    --no-publicly-accessible \
    --region "$REGION" 2>/dev/null \
    && ok "RDS creating (~5min)" || warn "RDS may exist"

  echo ""
  echo "  🔑 Password: $DB_PASSWORD"
  echo "  ⚠️  Save this password securely!"
  echo ""
  echo "  RDS 엔드포인트 확인 (생성 후):"
  echo "    aws rds describe-db-instances --db-instance-identifier ${PROJECT}-db \\"
  echo "      --query 'DBInstances[0].Endpoint' --output table --region $REGION"
  echo ""
  echo "  Security Group: $SG_ID"
}

# ── 4. VPC Connector (App Runner → RDS) ──

setup_vpc() {
  log "Creating VPC Connector for App Runner..."

  VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
    --query "Vpcs[0].VpcId" --output text --region "$REGION")

  SUBNETS=$(aws ec2 describe-subnets \
    --filters "Name=default-for-az,Values=true" \
    --query "Subnets[].SubnetId" --output json --region "$REGION")

  RDS_SG=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=${PROJECT}-rds-sg" \
    --query "SecurityGroups[0].GroupId" --output text --region "$REGION" 2>/dev/null || echo "")

  if [ -z "$RDS_SG" ]; then
    warn "RDS Security Group not found. Run 'rds' first."
    return
  fi

  SUBNET_LIST=$(echo "$SUBNETS" | jq -r '.[:2] | join(",")')

  aws apprunner create-vpc-connector \
    --vpc-connector-name "${PROJECT}-vpc-connector" \
    --subnets $(echo "$SUBNETS" | jq -r '.[:2] | .[]') \
    --security-groups "$RDS_SG" \
    --region "$REGION" 2>/dev/null \
    && ok "VPC Connector created" || warn "VPC Connector may exist"
}

# ── 5. Secrets Manager ──

setup_secrets() {
  log "Creating Secrets Manager entries..."

  NEXTAUTH_SECRET=$(openssl rand -base64 32)

  for name_data in \
    "database:{\"DATABASE_URL\":\"postgresql://cosfitadmin:PASS@HOST:5432/cosfit?schema=public&connection_limit=10\",\"DIRECT_URL\":\"postgresql://cosfitadmin:PASS@HOST:5432/cosfit?schema=public\"}" \
    "auth:{\"NEXTAUTH_SECRET\":\"${NEXTAUTH_SECRET}\",\"NEXTAUTH_URL\":\"https://cosfit.kr\"}" \
    "api-keys:{\"OPENAI_API_KEY\":\"\",\"KFDA_API_KEY\":\"\"}"; do

    NAME=$(echo "$name_data" | cut -d: -f1)
    DATA=$(echo "$name_data" | cut -d: -f2-)

    aws secretsmanager create-secret \
      --name "${PROJECT}/prod/${NAME}" \
      --secret-string "$DATA" \
      --region "$REGION" 2>/dev/null \
      && ok "Secret: ${PROJECT}/prod/${NAME}" \
      || warn "Secret exists: ${NAME}"
  done

  echo ""
  echo "  시크릿 업데이트:"
  echo "    aws secretsmanager update-secret --secret-id cosfit/prod/database \\"
  echo "      --secret-string '{\"DATABASE_URL\":\"actual_url\",\"DIRECT_URL\":\"actual_url\"}'"
}

# ── 6. App Runner Service ──

setup_apprunner() {
  log "Creating App Runner service..."

  # Replace ACCOUNT_ID placeholder
  sed "s/ACCOUNT_ID/${ACCOUNT_ID}/g" infra/apprunner-service.json > /tmp/apprunner-config.json

  aws apprunner create-service \
    --cli-input-json file:///tmp/apprunner-config.json \
    --region "$REGION" 2>/dev/null \
    && ok "App Runner service creating..." \
    || warn "Service may exist"

  echo ""
  echo "  서비스 확인:"
  echo "    aws apprunner list-services --region $REGION"
  echo ""
  echo "  서비스 ARN → GitHub Secret APP_RUNNER_SERVICE_ARN에 등록"
}

# ── Main ──

case "${1:-}" in
  iam)       setup_iam ;;
  ecr)       setup_ecr ;;
  rds)       setup_rds ;;
  vpc)       setup_vpc ;;
  secrets)   setup_secrets ;;
  apprunner) setup_apprunner ;;
  all)
    setup_iam; echo ""
    setup_ecr; echo ""
    setup_secrets; echo ""
    warn "RDS, VPC, App Runner는 순서대로 개별 실행하세요:"
    echo "  $0 rds       # DB 생성 후 엔드포인트 확인"
    echo "  $0 vpc       # VPC Connector 생성"
    echo "  $0 apprunner # App Runner 생성"
    ;;
  *)
    echo "COSFIT AWS Setup (Account: $ACCOUNT_ID, Region: $REGION)"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands (실행 순서):"
    echo "  1. iam        IAM 사용자/역할/정책 생성"
    echo "  2. ecr        ECR 레포지터리 생성"
    echo "  3. secrets    Secrets Manager 시크릿 생성"
    echo "  4. rds        RDS PostgreSQL 생성 (interactive)"
    echo "  5. vpc        VPC Connector 생성 (App Runner→RDS)"
    echo "  6. apprunner  App Runner 서비스 생성"
    echo "  all           1~3 자동 실행 + 4~6 안내"
    ;;
esac
