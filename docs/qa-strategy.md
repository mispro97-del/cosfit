# COSFIT QA 전략 문서

> 버전: 1.0.0 | 작성일: 2026-03-08 | 담당: QA Strategist Agent
> 스택: Next.js 14 App Router + TypeScript + Prisma + PostgreSQL + NextAuth v4

---

## 목차

1. [QA 전략 개요](#1-qa-전략-개요)
2. [테스트 범위 및 우선순위](#2-테스트-범위-및-우선순위)
3. [테스트 시나리오](#3-테스트-시나리오)
4. [UI/UX 체크리스트](#4-uiux-체크리스트)
5. [API 테스트 (curl)](#5-api-테스트-curl)
6. [로컬 테스트 실행 방법](#6-로컬-테스트-실행-방법)
7. [알려진 이슈 및 위험 항목](#7-알려진-이슈-및-위험-항목)

---

## 1. QA 전략 개요

### 1.1 품질 목표

| 지표 | 목표 | 기준 |
|------|------|------|
| Critical Bug | 0건 | 배포 블록 |
| 핵심 사용자 플로우 Pass Rate | 100% | FLOW-01~03 |
| API 응답 정확성 | 100% | 인증·분석 API |
| FIT Score 산출 일관성 | 100% | 동일 입력 동일 출력 |
| 페이지 로드 (LCP) | < 2.5s | 모바일 기준 |

### 1.2 테스트 접근법

COSFIT은 **Zero Script QA + 수동 UX 검증** 방식을 병행한다.

- **자동화 가능 영역**: FIT Score 알고리즘 단위 테스트 (기존 `__tests__` 존재), API curl 검증
- **수동 검증 필수 영역**: 온보딩 위자드 UX, 소셜 로그인, 결제 플로우
- **로그 기반 모니터링**: Docker 환경에서 실시간 JSON 로그로 오류 패턴 추적

### 1.3 테스트 환경

```
로컬: http://localhost:3000
  - Docker PostgreSQL (local)
  - .env.local 구성
  - NextAuth NEXTAUTH_SECRET 설정 필요

프로덕션: https://bmiitfnuq9.ap-northeast-1.awsapprunner.com
  - AWS RDS PostgreSQL
  - App Runner (ap-northeast-1)
```

### 1.4 역할별 테스트 계정 필요

| 역할 | 용도 |
|------|------|
| USER (일반) | FLOW-01, FLOW-02 검증 |
| USER (온보딩 미완료) | 온보딩 리디렉트 검증 |
| PARTNER | FLOW-03, 파트너 대시보드 검증 |
| ADMIN | 어드민 페이지 접근 검증 |
| 소셜 계정 (Google/Kakao) | 소셜 로그인 검증 (선택) |

---

## 2. 테스트 범위 및 우선순위

### 2.1 위험도 기반 우선순위

| 우선순위 | 영역 | 이유 |
|----------|------|------|
| **P0 (Critical)** | 인증/인가 미들웨어 | 무단 접근 차단, RBAC |
| **P0 (Critical)** | 회원가입 / 로그인 | 핵심 진입점, bcrypt 해시 |
| **P0 (Critical)** | FIT Score 산출 | 핵심 비즈니스 로직 |
| **P0 (Critical)** | onboardingStatus 리디렉트 | 로그인 후 분기 로직 |
| **P1 (High)** | 온보딩 위자드 전체 플로우 | 사용자 이탈 포인트 |
| **P1 (High)** | 비교 분석 실행 및 결과 조회 | 핵심 기능 |
| **P1 (High)** | 파트너 로그인 및 대시보드 | PARTNER 역할 격리 |
| **P1 (High)** | 제품 검색 API | 온보딩·비교 연계 |
| **P2 (Medium)** | 히스토리 페이지 | 데이터 조회 정확성 |
| **P2 (Medium)** | 공유 리포트 (`/share/[id]`) | 비로그인 접근 |
| **P2 (Medium)** | Rate Limit 동작 | API 남용 방지 |
| **P2 (Medium)** | 결제 플로우 (Toss PG) | 외부 의존성 |
| **P3 (Low)** | 어드민 데이터 수집 페이지 | 내부 운영 도구 |
| **P3 (Low)** | KFDA 동기화 | 배치 작업 |
| **P3 (Low)** | 이메일 발송 | 비동기 |

### 2.2 커버리지 목표

| 영역 | 커버리지 목표 |
|------|-------------|
| 인증/인가 엣지 케이스 | 100% |
| 핵심 플로우 Happy Path | 100% |
| 핵심 플로우 Edge Case | 80%+ |
| API 응답 포맷 | 100% |
| 역할 격리 (RBAC) | 100% |
| 모바일 반응형 | 핵심 페이지 100% |

---

## 3. 테스트 시나리오

### [FLOW-01] 회원가입 → 로그인 → 온보딩 → 히스토리

#### Happy Path

```
TC-01-01: 이메일 회원가입 정상 흐름
  Given: /signup 접속
  When:  유효한 이메일 + 비밀번호 입력 후 가입
  Then:  DB에 User 생성, onboardingStatus=PENDING, passwordHash=bcrypt 형식
         → /login 자동 이동 또는 성공 메시지 표시

TC-01-02: 이메일 로그인 후 온보딩 리디렉트
  Given: onboardingStatus=PENDING인 계정으로 /login 로그인
  When:  로그인 성공 → / 이동
  Then:  / 에서 session 확인 → /onboarding 자동 리디렉트

TC-01-03: 온보딩 완료 후 히스토리 이동
  Given: 온보딩 완료(status=COMPLETED) 계정으로 로그인
  When:  / 접속
  Then:  /history 리디렉트
```

#### Edge Cases

```
TC-01-E01: 중복 이메일 가입 시도
  Given: 이미 가입된 이메일
  When:  동일 이메일로 /signup 제출
  Then:  "이미 사용 중인 이메일입니다" 에러 표시, DB 중복 생성 없음

TC-01-E02: 비밀번호 틀린 로그인
  Given: 유효한 계정
  When:  잘못된 비밀번호 입력
  Then:  에러 메시지 표시, /login 유지, 세션 생성 안 됨

TC-01-E03: 비로그인 상태로 보호 페이지 접근
  Given: 세션 없음
  When:  /history 직접 접근
  Then:  /login?callbackUrl=/history 리디렉트

TC-01-E04: 빈 폼 제출
  Given: /signup or /login
  When:  필드 비워두고 제출
  Then:  각 필드 유효성 에러 표시

TC-01-E05: PARTNER 계정으로 USER 경로 접근
  Given: role=PARTNER 세션
  When:  /history 접속 (USER|PARTNER|ADMIN 허용이므로 실제 가능)
  Then:  정상 접근 (middleware ROUTE_RULES 확인 필요)

TC-01-E06: USER 계정으로 /partner/ 접근
  Given: role=USER 세션
  When:  /partner/dashboard 직접 접근
  Then:  /login?type=partner&error=unauthorized 리디렉트
```

---

### [FLOW-02] 온보딩 위자드

#### Happy Path

```
TC-02-01: Step 1 - 피부 타입 선택
  Given: /onboarding 접속 (status=PENDING)
  When:  건성/지성/복합성/민감성/보통 중 1개 선택 → 다음
  Then:  SkinProfile DB 저장 (skinType 필드), Step 2 진입

TC-02-02: Step 2 - 피부 고민 선택 (복수)
  Given: Step 2 화면
  When:  고민 항목 2개 이상 선택 → 다음
  Then:  skinConcerns 배열 저장, Step 3 진입

TC-02-03: Step 3 - 민감도 설정
  Given: Step 3 화면
  When:  민감도 슬라이더/버튼으로 1-5 선택 → 다음
  Then:  sensitivityLevel 저장, onboardingStatus=SKIN_PROFILED, Step 4 진입

TC-02-04: Step 4 - 제품 검색 후 인생템 등록
  Given: Step 4 화면
  When:  제품명 검색 → 결과에서 제품 선택 → "인생템 등록" 클릭
  Then:  HolyGrailProduct DB 생성, totalRegistered 카운트 업데이트
         onboardingStatus=PRODUCTS_ADDED

TC-02-05: Step 4 - 수동 입력으로 인생템 등록
  Given: Step 4 화면
  When:  검색 결과 없을 때 제품명 직접 입력 → 카테고리 선택 → 등록
  Then:  HolyGrailProduct(customName) 생성

TC-02-06: AI 분석 실행
  Given: 인생템 2개 이상 등록 완료
  When:  "AI 분석 시작" 클릭
  Then:  triggerStandardGeneration 실행, UserStandard 생성
         onboardingStatus=COMPLETED → /history 이동

TC-02-07: 완료 화면 표시
  Given: AI 분석 완료
  Then:  CompletionScreen 표시, /history 이동 버튼 활성화
```

#### Edge Cases

```
TC-02-E01: Step 1 선택 없이 다음 클릭
  Then:  "피부 타입을 선택해주세요" 에러, Step 유지

TC-02-E02: Step 2 고민 미선택 시 다음 클릭
  Then:  "최소 1개의 피부 고민을 선택해주세요" 에러

TC-02-E03: 인생템 1개만 등록 후 AI 분석 시도
  Then:  "최소 2개의 인생템이 필요합니다" 에러 반환

TC-02-E04: 동일 제품 중복 등록 시도
  Then:  "이미 등록된 제품입니다" 에러

TC-02-E05: 인생템 6번째 등록 시도 (최대 5개)
  Then:  "인생템은 최대 5개까지 등록할 수 있어요" 에러

TC-02-E06: 제품 검색 빈 쿼리
  Given: 검색창에 공백 또는 빈 문자열
  When:  검색 실행
  Then:  빈 결과 또는 전체 목록 (API 동작 확인)

TC-02-E07: 온보딩 완료 계정이 /onboarding 재접근
  Given: onboardingStatus=COMPLETED
  When:  /onboarding 직접 URL 접근
  Then:  /history 리디렉트 (재진입 방지 확인 필요)

TC-02-E08: AI 분석 중 네트워크 오류 시뮬레이션
  When:  분석 진행 중 연결 끊김
  Then:  에러 화면 표시, 재시도 버튼 제공
```

---

### [FLOW-03] 파트너 로그인 플로우

#### Happy Path

```
TC-03-01: 파트너 탭으로 로그인
  Given: /login 접속, 파트너 탭 선택
  When:  role=PARTNER 계정 이메일/비밀번호 입력
  Then:  /partner/dashboard 리디렉트

TC-03-02: 파트너 대시보드 데이터 표시
  Given: 파트너 로그인 상태
  When:  /partner/dashboard 접속
  Then:  파트너 통계(비교 수, FIT Score 분포 등) 표시

TC-03-03: 파트너 제품 목록 조회
  Given: 파트너 로그인 상태
  When:  /partner/products 접속
  Then:  해당 파트너 제품 목록 표시
```

#### Edge Cases

```
TC-03-E01: 일반 탭으로 파트너 계정 로그인 시도
  Given: role=PARTNER 계정
  When:  일반 탭 선택 후 로그인
  Then:  로그인 성공하나 / → PARTNER도 접근 가능 페이지 검토
         (미들웨어는 USER|PARTNER|ADMIN 허용하는 경로 존재)

TC-03-E02: 파트너 계정으로 /admin/ 접근
  Given: role=PARTNER 세션
  When:  /admin/data-collection 직접 접근
  Then:  FORBIDDEN 또는 /login?type=admin&error=unauthorized 리디렉트

TC-03-E03: role=PARTNER 계정으로 /api/v1/admin 호출
  Given: PARTNER JWT
  When:  ADMIN 전용 API 호출
  Then:  HTTP 403 + { code: "FORBIDDEN" }
```

---

### [FLOW-04] FIT Score 비교 분석

```
TC-04-01: 제품 비교 분석 실행 (Happy Path)
  Given: UserStandard 생성 완료, 유효한 productId
  When:  runCompareAnalysis(userId, productId) 호출
  Then:  CompareResult DB 저장, fitScore 0-100 범위, fitGrade 반환

TC-04-02: 분석 결과 상세 조회
  Given: 저장된 compareId
  When:  /compare/[id] 접속
  Then:  FIT Score, matchedGood, matchedRisk, missingPreferred, breakdown 표시

TC-04-03: FIT Score 등급 경계 확인
  Given: 각 경계값 테스트 케이스
  Then:  >=85 → PERFECT, >=70 → GOOD, >=50 → FAIR, >=30 → POOR, else → RISK

TC-04-E01: UserStandard 없는 사용자가 비교 시도
  Then:  "개인 기준이 아직 생성되지 않았습니다" 에러

TC-04-E02: 존재하지 않는 productId로 비교
  Then:  "제품을 찾을 수 없습니다" 에러

TC-04-E03: 다른 사용자의 compareId 접근 (권한 격리)
  Given: userA의 compareId
  When:  userB가 /compare/[userA-compareId] 접근
  Then:  404 또는 에러 (fetchCompareResult에서 userId 필터링 확인)
```

---

### [FLOW-05] 공유 리포트 (비로그인 접근)

```
TC-05-01: 공유 링크 비로그인 접근
  Given: /share/[compareId] URL
  When:  세션 없이 접근
  Then:  분석 결과 표시 (PUBLIC_PATHS에 /share 포함됨)
         개인정보 노출 없이 FIT Score·성분 정보만 표시

TC-05-E01: 존재하지 않는 공유 ID 접근
  Then:  404 또는 에러 페이지

TC-05-E02: 공유 페이지에서 /history 링크 클릭
  Given: 비로그인
  Then:  /login 리디렉트
```

---

### [FLOW-06] Rate Limit 동작

```
TC-06-01: 제품 검색 Rate Limit (60req/min)
  Given: 로그인 상태
  When:  60초 내 61회 GET /api/v1/products/search
  Then:  61번째 요청 → HTTP 429, { code: "RATE_LIMITED", retryAfter: N }
         X-RateLimit-Remaining 헤더 감소 확인

TC-06-02: 결제 API Rate Limit (30req/min)
  Given: 로그인 상태
  When:  60초 내 31회 POST /api/v1/payment
  Then:  31번째 → 429

TC-06-03: Rate Limit 창 만료 후 초기화
  Given: Rate Limit 초과 상태
  When:  retryAfter 초 경과 후 재시도
  Then:  정상 응답 (200)
```

---

## 4. UI/UX 체크리스트

### 4.1 디자인 일관성

```
공통
[ ] COSFIT 브랜드 색상 (#C4816A 톤) 일관 적용
[ ] Noto Sans KR 폰트 로드 확인 (display: swap)
[ ] 최대 너비 max-w-lg (512px) 유지 - 모바일 퍼스트
[ ] 헤더 sticky 동작 (스크롤 시 고정)
[ ] 로딩 스피너 / Skeleton UI 표시 (비동기 데이터)

버튼 및 인터랙션
[ ] 주요 CTA 버튼 disabled 상태 스타일
[ ] 로딩 중 버튼 텍스트/상태 변경 (이중 제출 방지)
[ ] hover/active 상태 시각적 피드백
[ ] 에러 상태 폼 필드 하이라이트

피드백 메시지
[ ] 성공/에러 토스트 또는 인라인 메시지
[ ] 에러 메시지 사용자 친화적 한국어
[ ] 빈 상태(Empty State) 화면 표시 (/history 결과 없을 때)
```

### 4.2 반응형 (모바일 우선)

```
기기별 확인
[ ] 모바일 375px (iPhone SE)
[ ] 모바일 390px (iPhone 14)
[ ] 태블릿 768px
[ ] 데스크탑 1280px

확인 항목
[ ] 온보딩 위자드 스텝 표시 (ProgressDots) 모바일 렌더링
[ ] 제품 검색 결과 목록 스크롤
[ ] FIT Score 비교 보고서 카드 레이아웃
[ ] 히스토리 아이템 카드 가독성
[ ] 파트너 대시보드 차트/통계 테이블 스크롤
```

### 4.3 접근성 (Accessibility)

```
[ ] 폼 input에 label 연결 (htmlFor / aria-label)
[ ] 에러 메시지 aria-describedby 연결
[ ] 버튼에 의미 있는 텍스트 또는 aria-label
[ ] 색상 대비 비율 4.5:1 이상 (WCAG AA)
[ ] 키보드 Tab 순서 논리적
[ ] 모달/다이얼로그 focus trap
[ ] 이미지 alt 속성 (제품 이미지, 로고)
[ ] <html lang="ko"> 설정 확인 (layout.tsx에 이미 적용됨)
```

### 4.4 성능

```
[ ] 초기 페이지 LCP < 2.5s (Chrome DevTools Lighthouse)
[ ] CLS < 0.1 (Noto Sans display:swap 관련)
[ ] next/font 적용으로 FOUT 최소화 확인
[ ] 제품 이미지 lazy loading
[ ] API 요청 중 중복 호출 방지 (onboarding 버튼 연타)
```

### 4.5 에러/예외 페이지

```
[ ] /not-found.tsx (404) 표시 정상
[ ] error.tsx (500) 표시 정상
[ ] (user)/error.tsx 사용자 영역 에러 바운더리
[ ] (partner)/error.tsx 파트너 에러 바운더리
[ ] loading.tsx Suspense fallback 표시
```

---

## 5. API 테스트 (curl)

> 전제조건: `http://localhost:3000` 실행 중, 아래 변수 설정

```bash
BASE_URL="http://localhost:3000"

# 로그인 후 cookie 파일에 세션 저장 (NextAuth JWT 방식)
# NextAuth는 HTTP-only 쿠키 사용. curl에서는 --cookie-jar로 처리
COOKIE_JAR="/tmp/cosfit_cookies.txt"
```

---

### 5.1 공개 API 테스트

```bash
# [PUB-01] 헬스 체크
curl -s "$BASE_URL/api/health" | jq .

# 기대값: {"status":"ok"} 또는 200 OK

# [PUB-02] 제품 검색 (공개 API - PUBLIC_PATHS 포함)
curl -s "$BASE_URL/api/v1/products/search?q=세럼&page=1&limit=5" | jq .

# 기대값:
# {
#   "success": true,
#   "data": [...],
#   "meta": { "page": 1, "limit": 5, "total": N, "totalPages": N }
# }

# [PUB-03] 제품 검색 - 카테고리 필터
curl -s "$BASE_URL/api/v1/products/search?category=SERUM&limit=3" | jq .

# [PUB-04] 제품 검색 - 빈 쿼리 (전체 목록)
curl -s "$BASE_URL/api/v1/products/search" | jq .

# [PUB-05] 제품 검색 - 존재하지 않는 쿼리
curl -s "$BASE_URL/api/v1/products/search?q=NOTEXISTPRODUCT99999" | jq .
# 기대: { "data": [], "meta": { "total": 0 } }
```

---

### 5.2 인증 API 테스트

```bash
# [AUTH-01] 회원가입 (이메일)
curl -s -X POST "$BASE_URL/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_qa_001@cosfit.local",
    "password": "TestPassword123!",
    "name": "QA 테스터"
  }' | jq .

# 기대: { "success": true, "data": { "userId": "..." } }

# [AUTH-02] 중복 이메일 가입 시도
curl -s -X POST "$BASE_URL/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_qa_001@cosfit.local",
    "password": "TestPassword123!",
    "name": "중복"
  }' | jq .

# 기대: { "success": false, "error": { "code": "...", "message": "..." } }

# [AUTH-03] NextAuth 로그인 세션 취득 (CSRF token 필요)
# 1단계: CSRF 토큰 취득
curl -s -c "$COOKIE_JAR" "$BASE_URL/api/auth/csrf" | jq .

# 2단계: 로그인 (CSRF 토큰 포함)
CSRF_TOKEN=$(curl -s -c "$COOKIE_JAR" "$BASE_URL/api/auth/csrf" | jq -r '.csrfToken')

curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=test_qa_001%40cosfit.local&password=TestPassword123!&csrfToken=$CSRF_TOKEN&callbackUrl=%2F" \
  -L | head -c 500

# [AUTH-04] 세션 확인
curl -s -b "$COOKIE_JAR" "$BASE_URL/api/auth/session" | jq .
# 기대: { "user": { "id": "...", "email": "...", "role": "USER", "onboardingStatus": "..." } }
```

---

### 5.3 인가(RBAC) 테스트

```bash
# [RBAC-01] 비로그인으로 보호된 API 접근
curl -s "$BASE_URL/api/v1/partners/test-id/stats" | jq .
# 기대: HTTP 401 { "error": { "code": "UNAUTHORIZED" } }

# [RBAC-02] 비로그인으로 보호된 API 접근 (products는 rate limit 필요)
curl -s "$BASE_URL/api/v1/products/search" | jq .
# 주의: products/search는 PUBLIC_PATHS에 포함됨 → 200 기대

# [RBAC-03] USER 토큰으로 파트너 API 접근 시도
# (USER 로그인 쿠키 사용)
curl -s -b "$COOKIE_JAR" \
  "$BASE_URL/api/v1/partners/any-partner-id/stats" | jq .
# 기대: HTTP 403 { "error": { "code": "FORBIDDEN" } }
```

---

### 5.4 Rate Limit 테스트

```bash
# [RL-01] 제품 검색 Rate Limit 트리거 (60req/min 제한)
# 주의: 실제 실행 시 DB 부하 발생 가능. 스테이징에서 실행 권장.
for i in $(seq 1 65); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -b "$COOKIE_JAR" \
    "$BASE_URL/api/v1/products/search?q=test&page=$i")
  echo "Request $i: HTTP $STATUS"
  if [ "$STATUS" = "429" ]; then
    echo ">>> Rate Limit triggered at request $i"
    break
  fi
done

# [RL-02] Rate Limit 응답 포맷 확인
# (위 루프에서 429 받은 후)
curl -s -b "$COOKIE_JAR" \
  "$BASE_URL/api/v1/products/search?q=ratelimit_test" | jq .
# 기대:
# HTTP 429
# { "success": false, "error": { "code": "RATE_LIMITED", "retryAfter": N } }
# Header: Retry-After: N
```

---

### 5.5 비교 분석 API 테스트

```bash
# [CMP-01] 비교 분석 실행 (Server Action이므로 직접 API 호출 어려움)
# → 브라우저에서 /history 페이지의 "비교하기" 버튼으로 테스트
# 또는 직접 POST (x-user-id 헤더 방식 - 구버전 route)

curl -s -X POST "$BASE_URL/api/v1/compare" \
  -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "x-user-id: [실제-userId]" \
  -d '{
    "productId": "[실제-productId]",
    "userStandardId": "[실제-standardId]"
  }' | jq .

# [CMP-02] 분석 히스토리 조회 (Server Action)
# → 브라우저 /history 접속으로 확인

# [CMP-03] 공유 리포트 비로그인 접근
curl -s "$BASE_URL/share/[실제-compareId]" | grep -c "FIT Score"
# 기대: 1 이상 (FIT Score 텍스트 존재)
```

---

### 5.6 제품 상세 API 테스트

```bash
# [PRD-01] 제품 상세 조회
PRODUCT_ID=$(curl -s "$BASE_URL/api/v1/products/search?q=세럼&limit=1" | jq -r '.data[0].id')

curl -s -b "$COOKIE_JAR" \
  "$BASE_URL/api/v1/products/$PRODUCT_ID" | jq .

# [PRD-02] 존재하지 않는 제품 조회
curl -s -b "$COOKIE_JAR" \
  "$BASE_URL/api/v1/products/nonexistent-id-xyz" | jq .
# 기대: HTTP 404 { "error": { "code": "NOT_FOUND" } }

# [PRD-03] 리뷰 조회
curl -s -b "$COOKIE_JAR" \
  "$BASE_URL/api/v1/reviews?productId=$PRODUCT_ID" | jq .
```

---

### 5.7 응답 포맷 검증

모든 API 응답은 다음 표준 포맷을 따라야 한다.

```bash
# 성공 응답 포맷 확인
# { "success": true, "data": {...}, "meta"?: {...} }

# 에러 응답 포맷 확인
# { "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }

# 포맷 자동 검증 스크립트
check_api_format() {
  URL=$1
  RESPONSE=$(curl -s "$URL")
  HAS_SUCCESS=$(echo "$RESPONSE" | jq 'has("success")')
  echo "URL: $URL"
  echo "has 'success' field: $HAS_SUCCESS"
  echo "---"
}

check_api_format "$BASE_URL/api/v1/products/search?q=test"
check_api_format "$BASE_URL/api/health"
```

---

## 6. 로컬 테스트 실행 방법

### 6.1 사전 준비

```bash
# 1. 프로젝트 디렉토리 이동
cd C:/CosfitProject/cosfit

# 2. 환경 변수 확인 (.env.local 존재 여부)
ls .env.local
# 없으면 .env.example 복사 후 수정
cp .env.example .env.local

# 3. 필수 환경 변수 설정 (.env.local)
# DATABASE_URL=postgresql://...@localhost:5432/cosfit
# NEXTAUTH_SECRET=your-random-secret-min-32chars
# NEXTAUTH_URL=http://localhost:3000
# NEXT_PUBLIC_APP_URL=http://localhost:3000

# 4. 의존성 설치
npm install
```

### 6.2 Docker PostgreSQL 시작

```bash
# Docker Compose로 PostgreSQL 시작 (docker-compose.yml 있을 경우)
docker-compose up -d postgres

# 또는 Docker 단독 실행
docker run -d \
  --name cosfit-postgres \
  -e POSTGRES_DB=cosfit \
  -e POSTGRES_USER=cosfit \
  -e POSTGRES_PASSWORD=cosfit_dev_pass \
  -p 5432:5432 \
  postgres:15-alpine

# DB 연결 확인
docker exec -it cosfit-postgres psql -U cosfit -d cosfit -c "SELECT version();"
```

### 6.3 DB 마이그레이션 및 시드

```bash
# Prisma 마이그레이션 적용
npx prisma migrate deploy

# 또는 개발 환경 (마이그레이션 파일 재생성 포함)
npx prisma migrate dev

# Prisma Studio (DB 데이터 확인)
npx prisma studio
# → http://localhost:5555

# 테스트 데이터 시드 (있을 경우)
npx prisma db seed
```

### 6.4 개발 서버 시작

```bash
# 개발 서버 시작
npm run dev
# → http://localhost:3000

# 빌드 후 프로덕션 모드 테스트 (빌드 오류 확인)
npm run build && npm start
```

### 6.5 기존 단위 테스트 실행

```bash
# FIT Score 엔진 단위 테스트
npx jest src/lib/analysis/__tests__/

# 특정 테스트 파일
npx jest src/lib/analysis/__tests__/fit-score-v3.test.ts --verbose

# 전체 테스트
npx jest --coverage
```

### 6.6 수동 QA 테스트 순서

아래 순서로 브라우저 수동 테스트를 진행한다.

```
Phase 1: 기본 동작 확인 (30분)
  1. http://localhost:3000 접속 → 리디렉트 동작 확인
  2. /signup → 신규 계정 생성
  3. /login → 로그인, /onboarding 리디렉트 확인
  4. Chrome DevTools → Network 탭 → API 응답 상태코드 확인

Phase 2: 온보딩 전체 플로우 (20분)
  1. Step 1 ~ Step 4 순서대로 진행
  2. 각 스텝에서 에러 케이스 (미선택 상태로 다음 클릭)
  3. 제품 검색 → 인생템 등록 (최소 2개)
  4. AI 분석 실행 → 완료 화면 확인
  5. /history 이동 확인

Phase 3: 비교 분석 플로우 (15분)
  1. /history에서 제품 선택 → 비교 분석 실행
  2. /compare/[id] 결과 확인 (FIT Score, 등급, 성분 목록)
  3. 공유 링크 → 비로그인 창에서 열기

Phase 4: RBAC 검증 (15분)
  1. USER 계정으로 /partner/dashboard 직접 접근 → 리디렉트 확인
  2. USER 계정으로 /admin/data-collection → 리디렉트 확인
  3. 비로그인으로 /history → /login 리디렉트
  4. 파트너 탭 로그인 → /partner/dashboard 진입

Phase 5: 모바일 반응형 확인 (10분)
  1. Chrome DevTools → Device Mode (iPhone SE, 375px)
  2. 온보딩 위자드 모바일 레이아웃
  3. 히스토리 카드 목록 스크롤
  4. 비교 분석 보고서 모바일 표시
```

### 6.7 로그 모니터링 (Zero Script QA)

```bash
# 개발 서버 로그 실시간 모니터링
npm run dev 2>&1 | tee /tmp/cosfit-dev.log

# 에러 필터링
npm run dev 2>&1 | grep -E "ERROR|error|Error|FAIL"

# 미들웨어 접근 로그 필터 (development 모드에서만 출력)
npm run dev 2>&1 | grep "\[MW\]"

# Docker 사용 시 컨테이너 로그
docker logs -f cosfit-app 2>&1 | grep -E "ERROR|DENY|FORBIDDEN|RATE_LIMITED"
```

### 6.8 테스트 계정 빠른 생성 스크립트

```bash
# Prisma를 통해 테스트 계정 직접 생성
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  const hash = await bcrypt.hash('TestPass123!', 12);

  // 일반 사용자 (온보딩 미완료)
  await prisma.user.upsert({
    where: { email: 'user_pending@qa.local' },
    update: {},
    create: { email: 'user_pending@qa.local', name: 'QA User', passwordHash: hash, role: 'USER', onboardingStatus: 'PENDING' }
  });

  // 일반 사용자 (온보딩 완료)
  await prisma.user.upsert({
    where: { email: 'user_done@qa.local' },
    update: {},
    create: { email: 'user_done@qa.local', name: 'QA Done', passwordHash: hash, role: 'USER', onboardingStatus: 'COMPLETED' }
  });

  // 파트너
  await prisma.user.upsert({
    where: { email: 'partner@qa.local' },
    update: {},
    create: { email: 'partner@qa.local', name: 'QA Partner', passwordHash: hash, role: 'PARTNER', onboardingStatus: 'COMPLETED' }
  });

  console.log('Test accounts created');
  await prisma.\$disconnect();
}
seed().catch(console.error);
"
```

---

## 7. 알려진 이슈 및 위험 항목

### 7.1 현재 알려진 이슈

| ID | 이슈 | 영향도 | 상태 |
|----|------|--------|------|
| BUG-001 | `/api/v1/compare` route.ts에서 userId를 x-user-id 헤더로 직접 취득 (JWT 검증 없음) | High | 검토 필요 |
| BUG-002 | `/api/v1/compare` route.ts에서 mockStandard 사용 (실제 DB 미조회) - TODO 주석 | High | 미구현 |
| BUG-003 | `partner/dashboard/page.tsx`에서 fetchPartnerDashboard 주석 처리 (하드코딩 partner-id) | Medium | 미구현 |
| WARN-001 | Rate Limiter가 인메모리 Map 사용 → 서버 재시작/다중 인스턴스 시 초기화 | Medium | 설계 제한 |
| WARN-002 | 소셜 로그인 (Google/Kakao) 환경변수 미설정 시 Provider 비활성화됨 | Low | 조건부 동작 |

### 7.2 테스트 전 확인 필요 항목

```
[ ] .env.local에 NEXTAUTH_SECRET 설정 (최소 32자)
[ ] DATABASE_URL 연결 문자열 정확성
[ ] Docker PostgreSQL 컨테이너 정상 실행 중
[ ] npx prisma migrate deploy 완료
[ ] (선택) TOSS_SECRET_KEY 설정 (결제 테스트 시)
[ ] (선택) OPENAI_API_KEY 설정 (AI 분석 테스트 시)
```

### 7.3 테스트 제외 항목 (현 단계)

| 항목 | 제외 이유 |
|------|----------|
| Toss PG 실결제 | 실제 과금 발생 위험 (샌드박스 환경 필요) |
| Google/Kakao 소셜 로그인 | OAuth 앱 설정 필요, 로컬에서 콜백 URL 설정 복잡 |
| KFDA 데이터 동기화 | 외부 API 의존, 배치 작업 |
| AWS App Runner 프로덕션 | 별도 배포 파이프라인 |

### 7.4 회귀 테스트 트리거 조건

다음 코드 변경 시 전체 테스트 재실행:

```
- src/middleware.ts 변경
- src/lib/auth.ts 변경
- src/lib/analysis/fit-score.ts 변경
- prisma/schema.prisma 변경
- src/app/(user)/onboarding/actions.ts 변경
```

---

## 부록 A: 테스트 결과 기록 템플릿

```markdown
# COSFIT QA 테스트 결과 - [날짜]

## 요약
- 테스트 실행일: YYYY-MM-DD
- 환경: 로컬 (localhost:3000) / 스테이징
- 테스터: [이름]

## 결과 요약
| 플로우 | Happy Path | Edge Case | 비고 |
|--------|-----------|-----------|------|
| FLOW-01 회원가입/로그인 | ✅ / ❌ | ✅ / ❌ | |
| FLOW-02 온보딩 | ✅ / ❌ | ✅ / ❌ | |
| FLOW-03 파트너 | ✅ / ❌ | ✅ / ❌ | |
| FLOW-04 FIT Score | ✅ / ❌ | ✅ / ❌ | |
| FLOW-05 공유 리포트 | ✅ / ❌ | ✅ / ❌ | |
| FLOW-06 Rate Limit | ✅ / ❌ | - | |

## 발견된 버그
### BUG-[N]: [제목]
- 재현 경로:
- 기대 동작:
- 실제 동작:
- 심각도: Critical / High / Medium / Low
- 스크린샷/로그:
```

---

*이 문서는 QA Strategist Agent에 의해 작성되었으며, 코드베이스 실제 구현을 기반으로 합니다.*
*마지막 업데이트: 2026-03-08*
