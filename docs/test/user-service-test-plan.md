# COSFIT 사용자 서비스 테스트 계획서

## 1. 개요

| 항목 | 내용 |
|------|------|
| 문서명 | 사용자 서비스 테스트 계획서 |
| 대상 시스템 | COSFIT 사용자 웹 (Next.js 14 App Router) |
| 작성일 | 2026-03-09 |
| 테스트 환경 | 로컬(localhost:3000) / AWS(App Runner) |
| 인증 방식 | NextAuth JWT (Credentials + Google + Kakao + Naver + Apple) |

## 2. 테스트 범위

### 2.1 포함 범위
- 회원가입 / 로그인 / 로그아웃 (이메일 + 소셜)
- 온보딩 (피부 프로필 + 인생템 + 기준 생성)
- 제품 비교 분석 (FIT Score)
- 비교 기록 목록 / 상세
- 제품 추천 목록 / 생성
- 루틴 관리 (모닝/이브닝) / 루틴 분석
- 쇼핑 (제품 탐색 / PDP / 장바구니 / 주문 / 결제)
- 마이페이지 (프로필 수정 / 비밀번호 변경 / 이메일 인증)
- 내 제품 관리

### 2.2 제외 범위
- 관리자/파트너 기능 (별도 문서)
- PG사 실결제 연동 (Mock 처리)
- 소셜 로그인 실제 OAuth 흐름 (별도 수동 테스트)

## 3. 테스트 시나리오

### 3.1 계정/인증

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| U-AUTH-01 | 회원가입 | 이메일 회원가입 성공 | 1. /signup 접속 2. 이메일+비밀번호(8자 이상)+이름 입력 3. 가입 제출 | POST /api/auth/signup 201, role=USER, onboardingStatus=PENDING | P0 |
| U-AUTH-02 | 회원가입 | 중복 이메일 가입 거부 | 1. 이미 가입된 이메일로 가입 시도 | 409 "이미 사용 중인 이메일입니다." | P0 |
| U-AUTH-03 | 회원가입 | 비밀번호 8자 미만 거부 | 1. 7자 비밀번호로 가입 시도 | 400 "비밀번호는 8자 이상이어야 합니다." | P0 |
| U-AUTH-04 | 회원가입 | 이메일 미입력 거부 | 1. 이메일 없이 가입 시도 | 400 "이메일과 비밀번호는 필수입니다." | P1 |
| U-AUTH-05 | 로그인 | 이메일 로그인 성공 | 1. /login 접속 2. 올바른 이메일+비밀번호 입력 | JWT 발급, 세션 생성, /home 리다이렉트 | P0 |
| U-AUTH-06 | 로그인 | 잘못된 비밀번호 로그인 실패 | 1. 올바른 이메일 + 잘못된 비밀번호 | 로그인 실패, 에러 메시지 표시 | P0 |
| U-AUTH-07 | 로그인 | 존재하지 않는 이메일 로그인 실패 | 1. 미등록 이메일로 로그인 시도 | 로그인 실패 | P1 |
| U-AUTH-08 | 소셜 로그인 | Google 로그인 | 1. Google 버튼 클릭 2. Google OAuth 완료 | 자동 계정 생성/연동, JWT 발급 | P1 |
| U-AUTH-09 | 소셜 로그인 | 카카오 로그인 | 1. 카카오 버튼 클릭 2. 카카오 OAuth 완료 | 자동 계정 생성/연동, JWT 발급 | P1 |
| U-AUTH-10 | 소셜 로그인 | 네이버 로그인 | 1. 네이버 버튼 클릭 2. 네이버 OAuth 완료 | 자동 계정 생성/연동, JWT 발급 | P2 |
| U-AUTH-11 | 소셜 로그인 | Apple 로그인 | 1. Apple 버튼 클릭 2. Apple OAuth 완료 | 자동 계정 생성/연동, JWT 발급 | P2 |
| U-AUTH-12 | 로그아웃 | 로그아웃 | 1. 로그아웃 클릭 | 세션 삭제, /login 리다이렉트 | P0 |
| U-AUTH-13 | 접근 제어 | 미인증 사용자 보호 페이지 접근 | 1. 로그인하지 않고 /home 접속 | /login?callbackUrl=/home 리다이렉트 | P0 |
| U-AUTH-14 | 접근 제어 | JWT 만료 후 재인증 | 1. 세션 만료(30분) 후 페이지 접근 | /login 리다이렉트 | P1 |
| U-AUTH-15 | 세션 | 세션 유지 (30분) | 1. 로그인 후 29분 경과 2. 페이지 접근 | 정상 접근 가능 | P1 |

### 3.2 온보딩

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| U-OB-01 | 피부 프로필 | 피부 타입 선택 | 1. /onboarding 접속 2. 피부 타입 선택 (DRY/OILY/COMBINATION/SENSITIVE/NORMAL) 3. 피부 고민 선택 (1개 이상) 4. 민감도 레벨 선택 (1~5) | SkinProfile 생성, onboardingStatus=SKIN_PROFILED | P0 |
| U-OB-02 | 피부 프로필 | 피부 고민 미선택 시 에러 | 1. skinConcerns 빈 배열로 저장 시도 | "최소 1개의 피부 고민을 선택해주세요." | P0 |
| U-OB-03 | 피부 프로필 | 민감도 범위 외 값 거부 | 1. sensitivityLevel=0 또는 6 | "민감도를 선택해주세요." | P1 |
| U-OB-04 | 피부 프로필 | 알레르기 성분 입력 (선택) | 1. allergies 배열 포함하여 저장 | allergies 필드에 정상 저장 | P1 |
| U-OB-05 | 인생템 등록 | 제품 검색 후 등록 | 1. 제품명 검색 2. 결과에서 제품 선택 3. 만족도 입력 4. 등록 | HolyGrailProduct 생성, onboardingStatus=PRODUCTS_ADDED | P0 |
| U-OB-06 | 인생템 등록 | 커스텀 제품 등록 | 1. customName + customBrand 입력 2. 카테고리 선택 3. 등록 | productId 없이 customName으로 생성 | P1 |
| U-OB-07 | 인생템 등록 | 중복 제품 등록 거부 | 1. 이미 등록된 제품 재등록 시도 | "이미 등록된 제품입니다." | P0 |
| U-OB-08 | 인생템 등록 | 최대 5개 제한 | 1. 5개 등록 후 6번째 시도 | "인생템은 최대 5개까지 등록할 수 있어요." | P0 |
| U-OB-09 | 인생템 삭제 | 인생템 삭제 | 1. 등록된 인생템 삭제 | HolyGrailProduct 삭제 | P1 |
| U-OB-10 | 기준 생성 | 기준 생성 트리거 | 1. 인생템 2개 이상 등록 상태 2. 기준 생성 버튼 클릭 | UserStandard 생성, confidenceScore 반환, onboardingStatus=COMPLETED | P0 |
| U-OB-11 | 기준 생성 | 인생템 부족 시 거부 | 1. 인생템 1개만 등록 후 기준 생성 시도 | "최소 2개의 인생템이 필요합니다." | P0 |
| U-OB-12 | 스킵 | 온보딩 스킵 (제품 단계) | 1. skipOnboarding("PRODUCTS") 호출 | onboardingStatus=SKIN_PROFILED | P2 |
| U-OB-13 | 스킵 | 온보딩 전체 스킵 | 1. skipOnboarding("COMPLETE") 호출 | onboardingStatus=COMPLETED | P2 |

### 3.3 제품 비교 분석

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| U-CMP-01 | 비교 실행 | 제품 비교 분석 실행 | 1. /compare 접속 2. 제품 검색 3. 제품 선택 4. 분석 실행 | CompareResult 생성, fitScore/fitGrade/matchedGood/matchedRisk 반환 | P0 |
| U-CMP-02 | 비교 실행 | UserStandard 없이 분석 시도 | 1. 온보딩 미완료 상태에서 분석 시도 | "개인 기준이 아직 생성되지 않았습니다." | P0 |
| U-CMP-03 | 비교 실행 | 존재하지 않는 제품 분석 시도 | 1. 잘못된 productId로 분석 | "제품을 찾을 수 없습니다." | P1 |
| U-CMP-04 | 결과 조회 | 분석 결과 상세 조회 | 1. 비교 결과 ID로 상세 페이지 접속 | FIT Score, 매칭 성분, 리스크 성분, 성분 비교 표 표시 | P0 |
| U-CMP-05 | 결과 조회 | 타인의 분석 결과 조회 불가 | 1. 다른 사용자의 compareId로 조회 | "분석 결과를 찾을 수 없습니다." | P0 |
| U-CMP-06 | 히스토리 | 비교 히스토리 목록 | 1. /history 접속 | 최신순 정렬, 페이지네이션 (20개씩) | P0 |
| U-CMP-07 | 히스토리 | 빈 히스토리 | 1. 분석 이력 없는 상태에서 히스토리 조회 | 빈 목록, items=[], total=0 | P1 |
| U-CMP-08 | 삭제 | 분석 결과 삭제 | 1. deleteCompareResult 호출 | CompareResult 삭제 | P1 |
| U-CMP-09 | API | /api/v1/compare POST | 1. 인증 헤더 포함 2. productId 전송 | 200, compareId + fitScore 반환 | P0 |
| U-CMP-10 | API | /api/v1/compare/history GET | 1. 인증 헤더 포함 | 200, 히스토리 목록 반환 | P1 |

### 3.4 제품 추천

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| U-REC-01 | 추천 목록 | 추천 목록 조회 | 1. /recommendations 접속 | 추천 제품 목록 (priority 순) 표시 | P0 |
| U-REC-02 | 추천 생성 | 추천 생성 실행 | 1. 추천 생성 버튼 클릭 | FIT Score 기반 최대 10개 제품 추천, 빠진 카테고리 우선 | P0 |
| U-REC-03 | 추천 생성 | UserStandard 없이 생성 시도 | 1. 온보딩 미완료 시 추천 생성 | "개인 기준이 아직 생성되지 않았습니다." | P1 |
| U-REC-04 | 필터 | 조회 필터 (viewed/not_viewed) | 1. filter=viewed로 조회 | 열람한 추천만 표시 | P2 |
| U-REC-05 | 열람 표시 | 추천 열람 처리 | 1. 추천 제품 클릭 | isViewed=true 업데이트 | P2 |

### 3.5 루틴 관리

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| U-RTN-01 | 루틴 조회 | 루틴 제품 조회 | 1. /routine 접속 | 모닝/이브닝별 제품 그룹 표시 (isCurrentUse=true) | P0 |
| U-RTN-02 | 순서 변경 | 루틴 순서 변경 | 1. 제품 드래그앤드롭 또는 순서 입력 2. updateRoutineOrder 호출 | routineType + routineOrder 업데이트 | P1 |
| U-RTN-03 | 순서 변경 | 잘못된 루틴 타입 거부 | 1. routineType="INVALID" | "잘못된 루틴 타입입니다." | P1 |
| U-RTN-04 | 루틴 분석 | 모닝 루틴 분석 | 1. /routine/analysis 접속 2. MORNING 분석 실행 | overallScore, conflicts, synergies, suggestions 반환 | P0 |
| U-RTN-05 | 루틴 분석 | 이브닝 루틴 분석 | 1. EVENING 분석 실행 | 동일 구조 결과 반환 | P1 |
| U-RTN-06 | 루틴 분석 | 제품 2개 미만 분석 거부 | 1. 루틴에 1개만 등록 후 분석 시도 | "루틴에 최소 2개 이상의 제품이 필요합니다." | P0 |
| U-RTN-07 | 루틴 분석 | 충돌 성분 감지 | 1. 충돌 관계 성분 포함 제품 2개 이상 등록 2. 분석 | conflicts 배열에 충돌 항목 포함 | P1 |
| U-RTN-08 | 루틴 분석 | 시너지 성분 감지 | 1. 시너지 관계 성분 포함 제품 등록 2. 분석 | synergies 배열에 시너지 항목 포함 | P2 |
| U-RTN-09 | 제안 | 선크림 미포함 모닝 루틴 | 1. 모닝 루틴에 선크림 없이 분석 | suggestions에 선크림 추가 권장 메시지 포함 | P2 |
| U-RTN-10 | 이전 분석 | 최신 분석 결과 조회 | 1. getLatestAnalysis("MORNING") | 가장 최근 분석 결과 반환 또는 null | P1 |

### 3.6 쇼핑

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| U-SHOP-01 | 탐색 | 제품 검색 | 1. /api/v1/products/search?q=크림 | 검색 결과 반환 | P0 |
| U-SHOP-02 | PDP | 제품 상세 페이지 | 1. /shop/{productId} 접속 | 제품명, 브랜드, 가격, 성분 목록, FIT Score 표시 | P0 |
| U-SHOP-03 | 장바구니 | 장바구니 추가 | 1. addToCart(productId, quantity, unitPrice) | CartItem 생성, upsert 동작 | P0 |
| U-SHOP-04 | 장바구니 | 동일 제품 재추가 (수량 증가) | 1. 이미 장바구니에 있는 제품 재추가 | quantity increment | P1 |
| U-SHOP-05 | 장바구니 | 장바구니 조회 | 1. /shop/cart 접속 | 장바구니 아이템 목록 표시 | P0 |
| U-SHOP-06 | 장바구니 | 수량 변경 | 1. updateCartQuantity(cartItemId, newQty) | 수량 변경 반영 | P1 |
| U-SHOP-07 | 장바구니 | 수량 0 설정 시 삭제 | 1. updateCartQuantity(cartItemId, 0) | CartItem 삭제 | P1 |
| U-SHOP-08 | 장바구니 | 장바구니 삭제 | 1. removeFromCart(cartItemId) | CartItem 삭제 | P0 |
| U-SHOP-09 | 결제 | 주문/결제 성공 | 1. /shop/checkout 접속 2. 배송 정보 입력 3. 결제 수단 선택 4. checkout 호출 | Order + OrderItem + ShippingInfo + Payment 생성, 장바구니 비움, 재고 차감 | P0 |
| U-SHOP-10 | 결제 | 빈 장바구니 결제 거부 | 1. 장바구니 비어있는 상태에서 checkout | "장바구니가 비어있습니다." | P0 |
| U-SHOP-11 | 결제 | 재고 부족 결제 거부 | 1. stock < quantity 제품 결제 시도 | "재고가 부족합니다." | P0 |
| U-SHOP-12 | 결제 | 무료배송 기준 | 1. 총액 50,000원 이상 주문 | shippingFee=0 | P1 |
| U-SHOP-13 | 결제 | 유료배송 | 1. 총액 50,000원 미만 주문 | shippingFee=3000 | P1 |
| U-SHOP-14 | 주문 내역 | 주문 목록 조회 | 1. /shop/orders 접속 | 주문 목록 최신순 표시 | P0 |
| U-SHOP-15 | 주문 내역 | 주문 상세 조회 | 1. fetchOrderDetail(orderId) | 주문 상품, 결제 정보, 배송 정보 표시 | P1 |
| U-SHOP-16 | 주문 내역 | 타인 주문 조회 불가 | 1. 다른 userId의 orderId로 조회 | "주문을 찾을 수 없습니다." | P0 |

### 3.7 마이페이지

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| U-MY-01 | 프로필 | 프로필 조회 | 1. /mypage 접속 | 이름, 이메일, 전화번호, 피부 프로필, 비교 횟수, 제품 수 표시 | P0 |
| U-MY-02 | 프로필 | 이름 수정 | 1. updateProfile({ name: "새이름" }) | 이름 업데이트 | P0 |
| U-MY-03 | 프로필 | 이름 50자 초과 거부 | 1. 51자 이름으로 수정 시도 | "이름은 50자 이내로 입력해주세요." | P1 |
| U-MY-04 | 프로필 | 전화번호 등록 | 1. updateProfile({ phone: "01012345678" }) | 전화번호 저장 (하이픈 제거, 형식 검증) | P1 |
| U-MY-05 | 프로필 | 잘못된 전화번호 거부 | 1. phone: "12345" | "올바른 휴대폰 번호를 입력해주세요." | P1 |
| U-MY-06 | 비밀번호 | 비밀번호 변경 성공 | 1. 현재 비밀번호 + 새 비밀번호 (8자 이상) 입력 | "비밀번호가 변경되었습니다." | P0 |
| U-MY-07 | 비밀번호 | 현재 비밀번호 불일치 | 1. 잘못된 현재 비밀번호 | "현재 비밀번호가 올바르지 않습니다." | P0 |
| U-MY-08 | 비밀번호 | 새 비밀번호 8자 미만 | 1. 7자 새 비밀번호 | "새 비밀번호는 8자 이상이어야 합니다." | P1 |
| U-MY-09 | 비밀번호 | 소셜 로그인 사용자 변경 불가 | 1. passwordHash 없는 사용자 | "소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다." | P1 |
| U-MY-10 | 이메일 인증 | 인증 메일 발송 | 1. sendVerificationEmail() 호출 | emailVerifyToken 생성, 24시간 만료 | P1 |
| U-MY-11 | 이메일 인증 | 이미 인증된 이메일 발송 거부 | 1. emailVerified 있는 상태에서 재발송 | "이미 인증된 이메일입니다." | P2 |
| U-MY-12 | 이메일 인증 | 이메일 인증 토큰 확인 | 1. /api/auth/verify-email?token=xxx 접속 | emailVerified 날짜 설정 | P1 |
| U-MY-13 | 인증 상태 | 이메일 인증 상태 확인 | 1. checkEmailVerification() 호출 | verified: true/false, verifiedAt 반환 | P2 |

### 3.8 내 제품 관리

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| U-PROD-01 | 조회 | 내 제품 목록 | 1. /my-products 접속 | UserProduct 목록 표시 | P1 |
| U-PROD-02 | 추가 | 제품 추가 | 1. /my-products/add 접속 2. 제품 검색 3. 등록 | UserProduct 생성 | P1 |

## 4. 테스트 데이터

### 4.1 테스트 계정
| 계정 | 이메일 | 비밀번호 | 상태 |
|------|--------|---------|------|
| 일반 사용자 | testuser@cosfit.kr | Test1234! | 온보딩 완료 |
| 신규 사용자 | newuser@cosfit.kr | Test1234! | 가입 직후 |
| 소셜 사용자 | social@gmail.com | (소셜) | 소셜 로그인 |

### 4.2 시드 데이터 (prisma/seed.ts 기준)
- 브랜드: 10개
- 성분: 30개
- 제품: 12개 (각 10개 성분 매핑)
- Product-Ingredient 매핑: 120개

## 5. 환경 설정

### 5.1 로컬 환경
```
DATABASE_URL=postgresql://user:pass@localhost:5432/cosfit
NEXTAUTH_SECRET=test-secret
NEXTAUTH_URL=http://localhost:3000
```

### 5.2 AWS 환경
```
App Runner URL: bmiitfnuq9.ap-northeast-1.awsapprunner.com
RDS: cosfit-db.c7wy8ga2kagh.ap-northeast-1.rds.amazonaws.com
```

### 5.3 실행 방법
```bash
# 로컬 서버 시작
npm run dev

# DB 시드
DATABASE_URL=... npx tsx prisma/seed.ts
```
