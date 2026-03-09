# COSFIT 관리자 서비스 테스트 계획서

## 1. 개요

| 항목 | 내용 |
|------|------|
| 문서명 | 관리자 서비스 테스트 계획서 |
| 대상 시스템 | COSFIT 관리자 대시보드 (/admin/*) |
| 작성일 | 2026-03-09 |
| 테스트 환경 | 로컬(localhost:3000) / AWS(App Runner) |
| 인증 방식 | NextAuth JWT (role=ADMIN), Super Admin 분리 |

## 2. 테스트 범위

### 2.1 포함 범위
- 관리자 로그인 / 권한 체크
- 성분 관리 (목록/상세/동의어/상호작용)
- 성분 지식 DB
- 리뷰 관리 (조회/승인/반려/AI 요약)
- 데이터 수집 (동기화 로그/트리거)
- 데이터 품질 대시보드
- ETL 파이프라인
- 정규화 배치
- 회원 관리 (목록/상세/검색/정지/활성화)
- 관리자 계정 관리 (생성/수정/삭제/OTP)
- 통계 대시보드 (사용자/서비스/이탈)
- 파트너 관리
- 커머스 관리

### 2.2 제외 범위
- 사용자/파트너 기능 (별도 문서)
- 외부 API 실통신 (식약처 등 Mock)

## 3. 테스트 시나리오

### 3.1 인증/권한

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| A-AUTH-01 | 로그인 | 관리자 로그인 성공 | 1. /admin/login 접속 2. ADMIN role 계정으로 로그인 | JWT 발급(role=ADMIN), /admin 대시보드 접근 | P0 |
| A-AUTH-02 | 로그인 | 일반 사용자 관리자 접근 거부 | 1. USER role 계정으로 /admin 접근 | /admin/login?error=unauthorized 리다이렉트 | P0 |
| A-AUTH-03 | 로그인 | PARTNER role 관리자 접근 거부 | 1. PARTNER role로 /admin 접근 | /admin/login?error=unauthorized 리다이렉트 | P0 |
| A-AUTH-04 | API 권한 | 미인증 API 호출 거부 | 1. 토큰 없이 /api/v1/admin/* 호출 | 401 "인증이 필요합니다." | P0 |
| A-AUTH-05 | API 권한 | 비관리자 API 호출 거부 | 1. USER 토큰으로 /api/v1/admin/* 호출 | 403 "접근 권한 없음" | P0 |
| A-AUTH-06 | Rate Limit | API Rate Limit 동작 | 1. 1분 내 200회 초과 /api/v1/admin 호출 | 429 "요청 한도 초과", Retry-After 헤더 | P2 |

### 3.2 성분 관리

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| A-ING-01 | 목록 | 성분 목록 조회 | 1. /admin/ingredients 접속 | 성분 목록 (nameInci, nameKo, safetyGrade, ewgScore) 페이지네이션 20개 | P0 |
| A-ING-02 | 검색 | 성분 검색 (INCI명) | 1. search="niacinamide" 검색 | INCI명 포함 성분 필터 | P0 |
| A-ING-03 | 검색 | 성분 검색 (한글명) | 1. search="나이아신아마이드" 검색 | 한글명 포함 성분 필터 | P1 |
| A-ING-04 | 상세 | 성분 상세 조회 | 1. /admin/ingredients/{id} 접속 | 전체 성분 정보 + 동의어 + 상호작용 표시 | P0 |
| A-ING-05 | 상세 | 존재하지 않는 성분 조회 | 1. 잘못된 ID로 접근 | "성분을 찾을 수 없습니다." | P1 |
| A-ING-06 | 동의어 | 동의어 추가 | 1. addSynonym(ingredientId, "VITAMIN B3", "EN") | IngredientSynonym 생성 | P1 |
| A-ING-07 | 동의어 | 빈 동의어 추가 거부 | 1. synonym="" | "동의어를 입력해주세요." | P1 |
| A-ING-08 | 동의어 | 중복 동의어 추가 거부 | 1. 이미 있는 동의어 추가 | "이미 등록된 동의어입니다." (P2002) | P1 |
| A-ING-09 | 동의어 | 동의어 삭제 | 1. removeSynonym(id) | IngredientSynonym 삭제 | P2 |
| A-ING-10 | 상호작용 | 상호작용 추가 | 1. addInteraction(A, B, "CONFLICT", "설명", 4) | IngredientInteraction 생성 | P1 |
| A-ING-11 | 상호작용 | 같은 성분 간 상호작용 거부 | 1. A == B | "같은 성분 간 상호작용은 등록할 수 없습니다." | P1 |
| A-ING-12 | 상호작용 | 중복 상호작용 거부 | 1. 이미 등록된 A-B 쌍 | "이미 등록된 상호작용입니다." | P2 |
| A-ING-13 | 상호작용 | 상호작용 삭제 | 1. removeInteraction(id) | IngredientInteraction 삭제 | P2 |
| A-ING-14 | 검색 보조 | 성분 자동완성 검색 | 1. searchIngredients("glyc") | 최대 10개 결과 (id, nameInci, nameKo) | P2 |

### 3.3 성분 지식 DB

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| A-KB-01 | 조회 | 지식 DB 조회 | 1. /admin/ingredients/knowledge 접속 | 성분 카테고리별 통계, 안전등급 분포 표시 | P1 |

### 3.4 리뷰 관리

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| A-REV-01 | 목록 | 대기 리뷰 목록 | 1. /admin/review-management 접속 | PENDING + AI_SUMMARIZED 상태 리뷰 50개까지 | P0 |
| A-REV-02 | 승인 | 리뷰 승인 | 1. approveReview(reviewId) | status=APPROVED | P0 |
| A-REV-03 | 반려 | 리뷰 반려 | 1. rejectReview(reviewId, reason) | status=REJECTED | P0 |
| A-REV-04 | AI 요약 | AI 요약 실행 | 1. triggerAiSummarize(reviewId) | aiSummary, aiSentiment, aiKeywords 생성, status=AI_SUMMARIZED | P1 |
| A-REV-05 | 전체 리뷰 | 리뷰 전체 목록 | 1. /admin/reviews 접속 | 전체 리뷰 조회 (actions.ts 별도 존재) | P1 |

### 3.5 데이터 수집/동기화

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| A-SYNC-01 | 로그 | 동기화 로그 조회 | 1. /admin/data-collection 접속 | DataSyncLog 최근 30건 목록 | P0 |
| A-SYNC-02 | 트리거 | 수동 동기화 트리거 | 1. triggerDataSync("식약처 API", "PRODUCTS") | DataSyncLog IN_PROGRESS 생성 | P1 |
| A-SYNC-03 | KFDA | KFDA 자동 수집 | 1. /api/cron/sync-kfda 호출 | KFDA 데이터 수집 실행 | P1 |

### 3.6 데이터 품질

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| A-DQ-01 | 대시보드 | 데이터 품질 현황 | 1. /admin/data-quality 접속 | 데이터 상태별 통계 표시 | P1 |

### 3.7 정규화/ETL

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| A-NORM-01 | 배치 | 정규화 배치 실행 | 1. runNormalizationBatch() | RAW_SAVED 제품을 NORMALIZING 전환, resolved/unresolved 반환 | P1 |
| A-NORM-02 | ETL | ETL 대시보드 | 1. /admin/etl 접속 | ETL 파이프라인 상태 표시 | P1 |
| A-NORM-03 | 정규화 | 정규화 대시보드 | 1. /admin/normalization 접속 | 정규화 현황 표시 | P2 |

### 3.8 회원 관리

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| A-MEM-01 | 대시보드 | 회원 통계 대시보드 | 1. getMemberDashboard() | todaySignups, monthSignups, yearSignups, totalMembers, activeMembers | P0 |
| A-MEM-02 | 목록 | 회원 목록 조회 | 1. /admin/members 접속 | 회원 목록 페이지네이션 20개, role=USER만 | P0 |
| A-MEM-03 | 검색 | 회원 검색 (이름) | 1. search="홍길동" | 이름 포함 회원 필터 | P1 |
| A-MEM-04 | 검색 | 회원 검색 (이메일) | 1. search="test@" | 이메일 포함 회원 필터 | P1 |
| A-MEM-05 | 필터 | 온보딩 상태 필터 | 1. onboardingFilter="COMPLETED" | 완료 상태만 표시 | P2 |
| A-MEM-06 | 상세 | 회원 상세 조회 | 1. /admin/members/{userId} 접속 | 피부 프로필, 주문 이력, 비교 횟수, 제품 수, 루틴 분석 횟수 | P0 |
| A-MEM-07 | 정지 | 회원 정지 | 1. updateMemberStatus(userId, "SUSPEND") | 세션 삭제, ActivityLog 기록 | P1 |
| A-MEM-08 | 활성화 | 회원 활성화 | 1. updateMemberStatus(userId, "ACTIVATE") | ActivityLog 기록 | P1 |
| A-MEM-09 | 비회원 | ADMIN role 회원 정지 시도 | 1. ADMIN role userId로 정지 | "해당 회원을 찾을 수 없습니다." | P1 |

### 3.9 관리자 계정 관리

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| A-ADM-01 | 목록 | 관리자 목록 조회 | 1. /admin/admin-users 접속 | SuperAdmin 우선 정렬, 권한/OTP 표시 | P0 |
| A-ADM-02 | 생성 | 관리자 계정 생성 (Super Admin) | 1. createAdminUser({ email, name, password, permissions }) | User(ADMIN) + AdminUser 생성 | P0 |
| A-ADM-03 | 생성 | 기존 User를 관리자로 승격 | 1. 이미 있는 이메일로 관리자 생성 | role 변경 + AdminUser 생성 | P1 |
| A-ADM-04 | 생성 | 이미 관리자인 계정 재등록 거부 | 1. 이미 AdminUser인 이메일 | "이미 관리자로 등록된 계정입니다." | P1 |
| A-ADM-05 | 생성 | 비Super Admin 생성 시도 거부 | 1. 일반 Admin이 createAdminUser 호출 | "슈퍼 관리자 권한이 필요합니다." | P0 |
| A-ADM-06 | 수정 | 관리자 권한 수정 | 1. updateAdminUser(id, { permissions }) | permissions 업데이트 | P1 |
| A-ADM-07 | 수정 | 관리자 이름 수정 | 1. updateAdminUser(id, { name: "새이름" }) | User.name 업데이트 | P2 |
| A-ADM-08 | 삭제 | 관리자 계정 삭제 | 1. deleteAdminUser(adminUserId) | AdminUser 삭제, role=USER 변경 | P1 |
| A-ADM-09 | 삭제 | 자기 자신 삭제 불가 | 1. 로그인한 관리자 자신 삭제 시도 | "자기 자신은 삭제할 수 없습니다." | P0 |
| A-ADM-10 | 삭제 | Super Admin 삭제 불가 | 1. SuperAdmin 삭제 시도 | "슈퍼 관리자는 삭제할 수 없습니다." | P0 |
| A-ADM-11 | OTP | OTP 설정 데이터 생성 | 1. getOtpSetupData(adminUserId) | secret + qrCodeUrl 반환 | P2 |
| A-ADM-12 | OTP | OTP 검증 (placeholder) | 1. verifyOtp(adminUserId, "123456") | 6자리 숫자면 성공, otpEnabled=true | P2 |
| A-ADM-13 | OTP | OTP 비활성화 (Super Admin) | 1. disableOtp(adminUserId) | otpEnabled=false, otpSecret=null | P2 |
| A-ADM-14 | OTP | OTP 필수 설정 토글 | 1. toggleOtpRequirement(true) | SystemSetting otp_required=true | P2 |
| A-ADM-15 | 비밀번호 | 관리자 비밀번호 초기화 | 1. resetAdminPassword(adminUserId, "NewPass123!") | passwordHash 업데이트 | P1 |
| A-ADM-16 | Super Admin | Super Admin 여부 확인 | 1. checkIsSuperAdmin() | true/false 반환 | P1 |

### 3.10 통계 대시보드

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| A-STAT-01 | 사용자 | 사용자 통계 조회 | 1. /admin/statistics 접속 | totalUsers, signupTrend(30일), WAU, MAU | P0 |
| A-STAT-02 | 서비스 | 서비스 이용 통계 | 1. getServiceUsageStats() | 비교분석, 온보딩, 주문, 루틴분석, 리뷰 횟수 | P1 |
| A-STAT-03 | 이탈 | 이탈/리텐션 통계 | 1. getChurnStats() | inactive7d/30d/90d, retentionRate | P1 |
| A-STAT-04 | 비활동 | 장기 비활동 사용자 조회 | 1. getLongInactiveUsers(30) | 30일 비활동 사용자 목록 (마스킹 적용) | P2 |

### 3.11 기타 관리 페이지

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| A-ETC-01 | 파트너 | 파트너 목록 | 1. /admin/partners 접속 | 파트너 목록 표시 | P1 |
| A-ETC-02 | 커머스 | 커머스 관리 | 1. /admin/commerce 접속 | 주문/상품 관리 페이지 | P2 |
| A-ETC-03 | 사용자 | 사용자 관리 (기존) | 1. /admin/users 접속 | 사용자 목록 (members와 별도 페이지) | P2 |

## 4. 테스트 데이터

### 4.1 테스트 계정
| 계정 | 이메일 | 비밀번호 | 역할 |
|------|--------|---------|------|
| Super Admin | admin@cosfit.kr | Admin1234! | ADMIN (isSuperAdmin=true) |
| 일반 Admin | subadmin@cosfit.kr | Admin1234! | ADMIN (isSuperAdmin=false) |

### 4.2 시드 데이터
- 관리자 시드: `npx tsx prisma/seed-admin.ts`
- 기본 시드: 브랜드 10, 성분 30, 제품 12

## 5. 환경 설정

### 5.1 관리자 시드 생성
```bash
npm run seed:admin
```

### 5.2 접근 URL
- 로컬: http://localhost:3000/admin/login
- AWS: https://bmiitfnuq9.ap-northeast-1.awsapprunner.com/admin/login
