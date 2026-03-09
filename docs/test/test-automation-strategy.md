# COSFIT 테스트 자동화 전략

## 1. 개요

| 항목 | 내용 |
|------|------|
| 문서명 | 테스트 자동화 전략 |
| 대상 시스템 | COSFIT 전체 (사용자/관리자/파트너) |
| 작성일 | 2026-03-09 |
| 스택 | Next.js 14 + TypeScript + Prisma + PostgreSQL |
| CI/CD | GitHub Actions + AWS App Runner |

## 2. 테스트 레이어 구조

```
Layer 4: E2E (Playwright)         - 핵심 사용자 흐름
Layer 3: Integration (Vitest)     - Server Actions + DB
Layer 2: API (Vitest + supertest) - REST API endpoints
Layer 1: Unit (Vitest)            - FIT Score 엔진, 유틸리티
```

### 2.1 레이어별 비율 (테스트 피라미드)

| 레이어 | 도구 | 비율 | 대상 |
|--------|------|------|------|
| Unit | Vitest | 40% | `src/lib/analysis/`, `src/lib/kfda/`, 유틸 함수 |
| API/Integration | Vitest + Prisma Test | 35% | Server Actions, API routes |
| E2E | Playwright | 25% | 온보딩, 비교, 쇼핑, 로그인 흐름 |

## 3. 로컬 테스트 환경

### 3.1 도구 선택: Playwright (E2E)

**선택 이유:**
- Next.js 14 App Router 공식 지원
- Server Actions 테스트 자연스러운 흐름
- 멀티 브라우저 (Chromium, Firefox, WebKit)
- 네트워크 인터셉트로 외부 API Mock 가능

### 3.2 도구 선택: Vitest (Unit/Integration)

**선택 이유:**
- TypeScript 네이티브 지원
- Next.js 호환 ESM 지원
- Prisma Client mock 용이
- Jest 호환 API

### 3.3 설치 및 설정

```bash
# E2E: Playwright
npm install -D @playwright/test
npx playwright install

# Unit/Integration: Vitest
npm install -D vitest @vitejs/plugin-react
```

### 3.4 Playwright 설정 (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // DB 의존 테스트이므로 순차 실행
  retries: 1,
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

### 3.5 Vitest 설정 (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3.6 테스트 DB 시드 전략

```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedTestData() {
  // 1. 테스트 전 DB 초기화 (테스트 데이터만)
  await prisma.$transaction([
    prisma.compareResult.deleteMany(),
    prisma.holyGrailProduct.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.userProduct.deleteMany(),
    prisma.skinProfile.deleteMany(),
    prisma.userStandard.deleteMany(),
  ]);

  // 2. 독립적 테스트 데이터 삽입
  // - 테스트 사용자 (USER, ADMIN, PARTNER 각 1명)
  // - 브랜드 3개, 성분 10개, 제품 5개
  // - 각 제품에 성분 매핑
}

export async function cleanupTestData() {
  // 테스트 종료 후 정리
}
```

**원칙:**
- 각 테스트 스위트는 독립적 테스트 데이터 사용
- `beforeAll`에서 시드, `afterAll`에서 정리
- 운영 데이터와 분리 (TEST_ prefix 또는 별도 DB)

### 3.7 npm script 통합

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "vitest run --coverage",
    "test:all": "vitest run && playwright test"
  }
}
```

## 4. 테스트 파일 구조

```
tests/
├── setup.ts                          # 글로벌 설정/시드
├── fixtures/                         # 공유 테스트 데이터
│   ├── users.ts                      # 테스트 사용자
│   ├── products.ts                   # 테스트 제품
│   └── ingredients.ts                # 테스트 성분
├── unit/
│   ├── fit-score.test.ts             # FIT Score 엔진
│   ├── user-standard.test.ts         # 기준 생성 알고리즘
│   └── helpers.test.ts               # 유틸 함수
├── integration/
│   ├── auth/
│   │   ├── signup.test.ts            # 회원가입 API
│   │   └── login.test.ts             # 로그인 흐름
│   ├── user/
│   │   ├── onboarding.test.ts        # 온보딩 Server Actions
│   │   ├── compare.test.ts           # 비교 분석
│   │   ├── shop.test.ts              # 장바구니/주문
│   │   └── routine.test.ts           # 루틴 관리
│   ├── admin/
│   │   ├── ingredients.test.ts       # 성분 관리
│   │   ├── members.test.ts           # 회원 관리
│   │   └── admin-users.test.ts       # 관리자 계정
│   └── partner/
│       ├── products.test.ts          # 제품 관리
│       ├── inventory.test.ts         # 재고 관리
│       └── orders.test.ts            # 주문 관리
└── e2e/
    ├── auth.spec.ts                  # 로그인/회원가입
    ├── onboarding.spec.ts            # 온보딩 전체 흐름
    ├── compare.spec.ts               # 비교 분석 흐름
    ├── shopping.spec.ts              # 쇼핑 흐름
    ├── admin-login.spec.ts           # 관리자 로그인
    └── partner-products.spec.ts      # 파트너 제품 등록
```

## 5. 핵심 E2E 시나리오 (Playwright)

### 5.1 사용자 흐름

```typescript
// tests/e2e/onboarding.spec.ts
import { test, expect } from '@playwright/test';

test.describe('온보딩 전체 흐름', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 사용자 로그인
    await page.goto('/login');
    await page.fill('[name="email"]', 'testuser@cosfit.kr');
    await page.fill('[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/onboarding');
  });

  test('피부 타입 선택 -> 인생템 등록 -> 기준 생성', async ({ page }) => {
    // Step 1: 피부 타입
    await page.click('[data-skin-type="COMBINATION"]');
    await page.click('[data-concern="ACNE"]');
    await page.click('[data-concern="PORES"]');
    await page.click('[data-sensitivity="3"]');
    await page.click('[data-action="save-skin"]');
    await expect(page.getByText('피부 프로필이 저장되었습니다')).toBeVisible();

    // Step 2: 인생템 등록
    await page.fill('[data-search="product"]', '크림');
    await page.click('[data-product-result]:first-child');
    await page.click('[data-action="register-product"]');
    // 2번째 제품 등록 (최소 2개)
    await page.fill('[data-search="product"]', '세럼');
    await page.click('[data-product-result]:first-child');
    await page.click('[data-action="register-product"]');

    // Step 3: 기준 생성
    await page.click('[data-action="generate-standard"]');
    await expect(page.getByText('개인 기준이 생성되었습니다')).toBeVisible();
  });
});
```

### 5.2 쇼핑 흐름

```typescript
// tests/e2e/shopping.spec.ts
test.describe('쇼핑 흐름', () => {
  test('제품 탐색 -> 장바구니 -> 주문', async ({ page }) => {
    // 로그인 (온보딩 완료 사용자)
    await loginAsCompletedUser(page);

    // 제품 상세
    await page.goto('/shop/PRODUCT_ID');
    await page.click('[data-action="add-to-cart"]');

    // 장바구니
    await page.goto('/shop/cart');
    await expect(page.locator('[data-cart-item]')).toHaveCount(1);

    // 결제
    await page.click('[data-action="checkout"]');
    await page.fill('[name="shippingName"]', '홍길동');
    await page.fill('[name="shippingPhone"]', '01012345678');
    await page.fill('[name="shippingZip"]', '06100');
    await page.fill('[name="shippingAddress"]', '서울시 강남구');
    await page.click('[data-payment="CARD"]');
    await page.click('[data-action="submit-order"]');

    await expect(page.getByText('주문이 완료되었습니다')).toBeVisible();
  });
});
```

## 6. Unit 테스트 예시

### 6.1 FIT Score 엔진

```typescript
// tests/unit/fit-score.test.ts
import { describe, it, expect } from 'vitest';
import { calculateFitScore } from '@/lib/analysis';
import type { FitScoreRequest } from '@/lib/analysis/types';

describe('FIT Score Engine', () => {
  it('선호 성분 포함 제품은 높은 점수', () => {
    const request: FitScoreRequest = {
      userStandard: {
        preferredIngredients: [
          { ingredientId: 'ing1', nameInci: 'NIACINAMIDE', weight: 0.8 }
        ],
        avoidIngredients: [],
        // ...
      },
      targetProduct: {
        productId: 'prod1',
        name: 'Test Cream',
        category: 'CREAM',
        ingredients: [
          { ingredientId: 'ing1', nameInci: 'NIACINAMIDE', orderIndex: 0, safetyGrade: 'SAFE', commonAllergen: false }
        ],
      },
      userAllergies: [],
    };

    const result = calculateFitScore(request);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('회피 성분 포함 제품은 낮은 점수', () => {
    // 회피 성분 테스트...
  });

  it('알레르기 성분은 최대 패널티', () => {
    // 알레르기 패널티 테스트...
  });
});
```

## 7. AWS 운영 환경 테스트

### 7.1 Smoke Test 스크립트

```bash
#!/bin/bash
# scripts/smoke-test.sh

BASE_URL="${1:-https://bmiitfnuq9.ap-northeast-1.awsapprunner.com}"
FAIL=0

echo "=== COSFIT Smoke Test ==="
echo "Target: $BASE_URL"

# 1. Health Check
echo -n "[1/6] Health Check... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
if [ "$STATUS" = "200" ]; then echo "OK"; else echo "FAIL ($STATUS)"; FAIL=1; fi

# 2. Landing Page
echo -n "[2/6] Landing Page... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$STATUS" = "200" ]; then echo "OK"; else echo "FAIL ($STATUS)"; FAIL=1; fi

# 3. Login Page
echo -n "[3/6] Login Page... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/login")
if [ "$STATUS" = "200" ]; then echo "OK"; else echo "FAIL ($STATUS)"; FAIL=1; fi

# 4. Signup API (validation error = 400 = alive)
echo -n "[4/6] Signup API... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" -d '{}')
if [ "$STATUS" = "400" ]; then echo "OK (expected 400)"; else echo "FAIL ($STATUS)"; FAIL=1; fi

# 5. Product Search API (auth required)
echo -n "[5/6] Product Search API... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/products/search?q=test")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "401" ]; then echo "OK ($STATUS)"; else echo "FAIL ($STATUS)"; FAIL=1; fi

# 6. Admin Login Page
echo -n "[6/6] Admin Login... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/login")
if [ "$STATUS" = "200" ]; then echo "OK"; else echo "FAIL ($STATUS)"; FAIL=1; fi

echo "========================"
if [ "$FAIL" = "0" ]; then
  echo "ALL PASSED"
  exit 0
else
  echo "SOME TESTS FAILED"
  exit 1
fi
```

### 7.2 GitHub Actions 배포 후 자동 E2E

```yaml
# .github/workflows/test-after-deploy.yml
name: Post-Deploy E2E

on:
  workflow_run:
    workflows: ["Deploy"]
    types: [completed]
    branches: [main]

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: actions/checkout@v4

      - name: Smoke Test
        run: bash scripts/smoke-test.sh https://bmiitfnuq9.ap-northeast-1.awsapprunner.com

      - name: Notify on Failure
        if: failure()
        run: echo "::error::Smoke test failed after deployment!"

  e2e-test:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    needs: smoke-test
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Run E2E Tests
        run: npx playwright test --project=chromium
        env:
          BASE_URL: https://bmiitfnuq9.ap-northeast-1.awsapprunner.com
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### 7.3 CI 통합 (PR 단위)

```yaml
# .github/workflows/ci.yml 에 추가
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: cosfit_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci

      - name: DB Setup
        run: npx prisma migrate deploy && npx tsx prisma/seed.ts
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/cosfit_test
          DIRECT_URL: postgresql://test:test@localhost:5432/cosfit_test

      - name: Unit & Integration Tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/cosfit_test
          NEXTAUTH_SECRET: test-secret-for-ci

      - name: E2E Tests
        run: |
          npx playwright install --with-deps chromium
          npm run test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/cosfit_test
          NEXTAUTH_SECRET: test-secret-for-ci
          NEXTAUTH_URL: http://localhost:3000
```

## 8. 모니터링/알림

### 8.1 CloudWatch 알림 설정 (AWS)

| 메트릭 | 조건 | 알림 |
|--------|------|------|
| App Runner HealthCheck | 연속 3회 실패 | SNS -> Slack/Email |
| RDS CPU | > 80% (5분) | SNS -> Email |
| RDS FreeStorageSpace | < 1GB | SNS -> Email |
| App Runner 5xx Errors | > 10건/분 | SNS -> Slack |

### 8.2 정기 Smoke Test (CloudWatch Synthetics 또는 cron)

```bash
# crontab (EC2 또는 Lambda)
# 매 5분마다 health check
*/5 * * * * curl -sf https://bmiitfnuq9.ap-northeast-1.awsapprunner.com/api/health || echo "COSFIT DOWN" | mail -s "ALERT" admin@cosfit.kr
```

## 9. 테스트 데이터 관리

### 9.1 서비스별 테스트 계정

| 서비스 | 이메일 | 비밀번호 | 역할 | 용도 |
|--------|--------|---------|------|------|
| 사용자 | testuser@cosfit.kr | Test1234! | USER | 온보딩 완료 사용자 |
| 사용자 (신규) | newuser@cosfit.kr | Test1234! | USER | 온보딩 미완료 |
| 관리자 (Super) | admin@cosfit.kr | Admin1234! | ADMIN | SuperAdmin |
| 관리자 (일반) | subadmin@cosfit.kr | Admin1234! | ADMIN | 권한 제한 테스트 |
| 파트너 | partner@cosfit.kr | Partner1234! | PARTNER | 제품/주문 관리 |
| 파트너2 | partner2@cosfit.kr | Partner1234! | PARTNER | 데이터 격리 테스트 |

### 9.2 시드 데이터 목록

| 데이터 | 수량 | 소스 |
|--------|------|------|
| 브랜드 | 10 | prisma/seed.ts |
| 성분 | 30 | prisma/seed.ts |
| 제품 | 12 | prisma/seed.ts |
| 제품-성분 매핑 | 120 | prisma/seed.ts |
| 관리자 계정 | 1 | prisma/seed-admin.ts |
| 성분 상호작용 | 시드 필요 | 미구현 -- 테스트 시드에 추가 필요 |
| 파트너 + 파트너제품 | 시드 필요 | 미구현 -- 테스트 시드에 추가 필요 |

### 9.3 테스트 시드 실행

```bash
# 기본 시드 (브랜드/성분/제품)
DATABASE_URL=postgresql://... npx tsx prisma/seed.ts

# 관리자 시드
DATABASE_URL=postgresql://... npx tsx prisma/seed-admin.ts

# 테스트 전용 시드 (추가 구현 필요)
DATABASE_URL=postgresql://... npx tsx tests/fixtures/seed-test.ts
```

## 10. 미구현 항목 및 권장 사항

| 항목 | 현재 상태 | 권장 사항 |
|------|----------|----------|
| Playwright 설정 | 미구현 | package.json에 devDependency 추가 |
| Vitest 설정 | 미구현 | vitest.config.ts 생성 |
| 테스트 시드 스크립트 | seed.ts만 존재 | 파트너/테스트계정 시드 추가 |
| Smoke Test 스크립트 | 미구현 | scripts/smoke-test.sh 생성 |
| CI 테스트 워크플로우 | deploy.yml만 존재 | test job 추가 |
| OTP 실제 구현 | Placeholder | speakeasy 라이브러리로 실제 TOTP 구현 |
| PG 결제 연동 | Mock URL 반환 | Toss Payments SDK 연동 |
| 소셜 로그인 테스트 | 수동 테스트만 가능 | OAuth Mock Server 또는 수동 TC |
