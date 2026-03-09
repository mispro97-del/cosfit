# COSFIT 파트너(입점사) 서비스 테스트 계획서

## 1. 개요

| 항목 | 내용 |
|------|------|
| 문서명 | 파트너(입점사) 서비스 테스트 계획서 |
| 대상 시스템 | COSFIT 파트너 센터 (/partner/*) |
| 작성일 | 2026-03-09 |
| 테스트 환경 | 로컬(localhost:3000) / AWS(App Runner) |
| 인증 방식 | NextAuth JWT (role=PARTNER), partnerId 기반 데이터 격리 |

## 2. 테스트 범위

### 2.1 포함 범위
- 파트너 로그인 / 회원가입
- 대시보드 (FIT Score 분포, 비교 분석, 매칭 성분)
- 제품 관리 (등록/수정/삭제/프로모션 토글)
  - 옵션(SKU/Variant) CRUD
  - 이미지 관리
  - 상세 설명 (HTML 리치 에디터)
- 재고 관리 (개별 조정/일괄 조정/이력/부족 알림)
- 주문 관리 / 배송 처리 / 반품 처리
- 프로모션 관리 (타임딜/번들/이벤트)
- 쿠폰 관리 (생성/수정/삭제/활성화 토글)
- 리뷰 관리 (수집 리뷰 조회/통계)
- 매출 분석 (일/주/월, 제품 성과, FIT Score 분포)
- 설정 (기본정보/연락처/담당자/세금계산서)

### 2.2 제외 범위
- 사용자/관리자 기능 (별도 문서)
- PG사 실결제

## 3. 테스트 시나리오

### 3.1 인증

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| P-AUTH-01 | 로그인 | 파트너 로그인 성공 | 1. /partner/login 접속 2. PARTNER role 계정으로 로그인 | JWT(role=PARTNER), /partner/dashboard 리다이렉트 | P0 |
| P-AUTH-02 | 로그인 | 일반 사용자 파트너 접근 거부 | 1. USER role로 /partner/dashboard 접근 | /partner/login?error=unauthorized 리다이렉트 | P0 |
| P-AUTH-03 | 로그인 | 미인증 접근 거부 | 1. 토큰 없이 /partner/* 접근 | /partner/login 리다이렉트 | P0 |
| P-AUTH-04 | 회원가입 | 파트너 회원가입 | 1. /partner/signup 접속 2. 사업자 정보 입력 | Partner + User(PARTNER) 생성 | P0 |
| P-AUTH-05 | API 권한 | 비파트너 API 호출 거부 | 1. USER 토큰으로 /api/v1/partners/* 호출 | 403 "접근 권한 없음" | P0 |
| P-AUTH-06 | Rate Limit | API Rate Limit | 1. 1분 내 100회 초과 호출 | 429 "요청 한도 초과" | P2 |

### 3.2 대시보드

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| P-DASH-01 | 조회 | 대시보드 데이터 조회 | 1. /partner/dashboard 접속 | overview(제품수, 비교수, 평균 FIT Score, 유니크 사용자) 표시 | P0 |
| P-DASH-02 | 분포 | FIT Score 분포 | 1. fetchPartnerDashboard() | fitScoreDistribution 차트 데이터 | P1 |
| P-DASH-03 | Top 성분 | 매칭/리스크 성분 | 1. 대시보드 조회 | topMatchedIngredients, topRiskIngredients | P2 |
| P-DASH-04 | 트렌드 | 월별 트렌드 | 1. 대시보드 조회 | monthlyTrend (최근 6개월) | P2 |

### 3.3 제품 관리

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| P-PROD-01 | 목록 | 내 제품 목록 조회 | 1. /partner/products 접속 | 파트너 제품 목록 (이름, 브랜드, 카테고리, 재고, 상태) | P0 |
| P-PROD-02 | 검색 | ProductMaster 검색 | 1. /partner/products/new 접속 2. 제품명 검색 | ACTIVE 상태 제품 최대 20개 결과 | P0 |
| P-PROD-03 | 등록 | 제품 전체 등록 (트랜잭션) | 1. ProductMaster 선택 2. 옵션(SKU, 가격, 재고) 입력 3. 이미지 업로드 4. 상세 설명 입력 5. createFullProduct 호출 | PartnerProduct + Variants + Images + Description 생성 | P0 |
| P-PROD-04 | 등록 | 이미 등록된 제품 거부 | 1. 동일 productId로 재등록 | "이미 등록된 제품입니다." | P0 |
| P-PROD-05 | 등록 | 중복 SKU 거부 | 1. 이미 사용 중인 SKU로 등록 | "이미 사용 중인 SKU가 있습니다: ..." | P1 |
| P-PROD-06 | 등록 | 존재하지 않는 ProductMaster 거부 | 1. 잘못된 productId | "연동할 제품을 찾을 수 없습니다." | P1 |
| P-PROD-07 | 상세 | 제품 상세 조회 | 1. /partner/products/{id} 접속 | 옵션, 이미지, 설명, 통계 표시 | P0 |
| P-PROD-08 | 상세 | 타 파트너 제품 조회 불가 | 1. 다른 파트너의 제품 ID로 접근 | "제품을 찾을 수 없습니다." | P0 |
| P-PROD-09 | 수정 | 제품 전체 수정 (트랜잭션) | 1. 옵션 추가/수정/삭제, 이미지 변경, 설명 수정 2. updateFullProduct 호출 | Variants/Images/Description 일괄 업데이트 | P0 |
| P-PROD-10 | 옵션 | 옵션(SKU) 추가 | 1. createProductVariant(ppId, data) | ProductVariant 생성, SKU 중복 체크 | P1 |
| P-PROD-11 | 옵션 | 옵션 수정 (가격 변경) | 1. updateProductVariant(variantId, { price: 35000 }) | PriceHistory 기록 + 가격 업데이트 | P1 |
| P-PROD-12 | 옵션 | 옵션 수정 (가격 미변경) | 1. price 동일하게 수정 | PriceHistory 미생성, 다른 필드만 변경 | P2 |
| P-PROD-13 | 옵션 | 옵션 삭제 | 1. deleteProductVariant(variantId) | ProductVariant 삭제 | P1 |
| P-PROD-14 | 옵션 | 타 파트너 옵션 수정 불가 | 1. 다른 파트너 소유 variantId 수정 | "옵션을 찾을 수 없습니다." | P0 |
| P-PROD-15 | 설명 | 상세 설명 수정 | 1. updateProductDescription(ppId, HTML content, shortDesc, highlights) | ProductDescription upsert | P1 |
| P-PROD-16 | 이미지 | 이미지 추가 | 1. addProductImage(ppId, url, isMain) | 기존 메인 해제 + 새 이미지 생성 | P1 |
| P-PROD-17 | 이미지 | 이미지 삭제 | 1. removeProductImage(imageId) | ProductImage 삭제 | P1 |
| P-PROD-18 | 이미지 | 타 파트너 이미지 삭제 불가 | 1. 다른 파트너 소유 imageId | "이미지를 찾을 수 없습니다." | P0 |
| P-PROD-19 | 삭제 | 제품 삭제 | 1. deleteProduct(ppId) | PartnerProduct + cascading 삭제 | P1 |
| P-PROD-20 | 프로모션 | 프로모션 토글 | 1. toggleProductPromotion(ppId) | isPromoted 반전 | P2 |

### 3.4 재고 관리

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| P-INV-01 | 현황 | 재고 전체 현황 | 1. /partner/inventory 접속 | totalSku, totalStock, lowStockCount, outOfStockCount + 아이템 목록 | P0 |
| P-INV-02 | 입고 | 재고 입고 | 1. adjustInventory(variantId, "IN", 50) | stock += 50, InventoryLog 기록 | P0 |
| P-INV-03 | 출고 | 재고 출고 | 1. adjustInventory(variantId, "OUT", 10) | stock -= 10 (최소 0), InventoryLog 기록 | P0 |
| P-INV-04 | 절대 조정 | 재고 절대값 조정 | 1. adjustInventory(variantId, "ADJUST", 100) | stock = 100, InventoryLog 기록 | P1 |
| P-INV-05 | 검증 | 음수 수량 거부 | 1. quantity=-5 | "수량은 0 이상이어야 합니다." | P1 |
| P-INV-06 | 소유권 | 타 파트너 재고 조정 불가 | 1. 다른 파트너 variantId | "옵션을 찾을 수 없습니다." | P0 |
| P-INV-07 | 일괄 | 일괄 재고 조정 | 1. bulkAdjustInventory([{variantId, "IN", 20}, ...]) | 복수 variant 트랜잭션 업데이트, successCount/failCount 반환 | P1 |
| P-INV-08 | 일괄 | 빈 배열 일괄 조정 거부 | 1. adjustments=[] | "조정 항목이 없습니다." | P2 |
| P-INV-09 | 이력 | 재고 변동 이력 조회 | 1. getInventoryLogs(variantId) | InventoryLog 목록 (페이지네이션 20개) | P1 |
| P-INV-10 | 이력 | 개별 옵션 이력 조회 | 1. getVariantHistory(variantId) | 최근 10건 이력 | P2 |
| P-INV-11 | 알림 | 재고 부족 알림 목록 | 1. getLowStockAlerts() | stock <= lowStockAlert 옵션 목록 (재고 적은 순) | P1 |

### 3.5 주문 관리

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| P-ORD-01 | 목록 | 주문 목록 조회 | 1. /partner/orders 접속 | partnerId 기준 OrderItem 목록 (주문번호, 제품명, 수량, 상태, 구매자) | P0 |
| P-ORD-02 | 상세 | 주문 상세 | 1. /partner/orders/{orderId} 접속 | 주문 상세 정보 표시 | P1 |
| P-ORD-03 | 배송 | 배송 정보 입력 | 1. updateShipping(orderItemId, "CJ대한통운", "1234567890") | ShippingInfo 업데이트, Order status=SHIPPED, 배송 이메일 발송 | P0 |
| P-ORD-04 | 배송 | 타 파트너 주문 배송 처리 불가 | 1. 다른 파트너의 orderItemId | "권한 없음" | P0 |
| P-ORD-05 | 반품 | 반품 승인 | 1. processReturn(orderItemId, true) | status=RETURNED, Payment status=REFUNDED | P1 |
| P-ORD-06 | 반품 | 반품 거절 | 1. processReturn(orderItemId, false) | status=SHIPPED (복원) | P1 |
| P-ORD-07 | 반품 | 타 파트너 반품 처리 불가 | 1. 다른 파트너의 orderItemId | "권한 없음" | P0 |
| P-ORD-08 | 구매자 | 구매자 이름 마스킹 | 1. 주문 목록 조회 | 이름 첫글자 + * + 마지막글자 형태 | P2 |

### 3.6 프로모션 관리

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| P-PROMO-01 | 목록 | 프로모션 목록 조회 | 1. /partner/promotions 접속 | Promotion 목록 (제품 수, 활성 상태) | P0 |
| P-PROMO-02 | 생성 | 프로모션 생성 | 1. createPromotion({ type: "TIMEDEAL", title, startDate, endDate, products }) | Promotion + PromotionProduct 생성 | P0 |
| P-PROMO-03 | 생성 | 제목 미입력 거부 | 1. title="" | "프로모션 제목을 입력하세요." | P1 |
| P-PROMO-04 | 생성 | 종료일 < 시작일 거부 | 1. endDate < startDate | "종료일은 시작일 이후여야 합니다." | P1 |
| P-PROMO-05 | 생성 | 제품 미선택 거부 | 1. products=[] | "최소 1개 이상의 제품을 선택하세요." | P1 |
| P-PROMO-06 | 생성 | 타 파트너 제품 포함 거부 | 1. 다른 파트너의 partnerProductId 포함 | "일부 제품이 유효하지 않습니다." | P0 |
| P-PROMO-07 | 수정 | 프로모션 수정 | 1. updatePromotion(id, data) | 기존 PromotionProduct 삭제 후 재생성 | P1 |
| P-PROMO-08 | 활성화 | 프로모션 활성화 토글 | 1. togglePromotionActive(id) | isActive 반전 | P1 |

### 3.7 쿠폰 관리

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| P-CPN-01 | 목록 | 쿠폰 목록 조회 | 1. /partner/promotions/coupons 접속 | Coupon 목록 + stats(total, active, totalUsed) | P0 |
| P-CPN-02 | 생성 | 쿠폰 생성 (정액) | 1. createCoupon({ discountType: "FIXED", discountValue: 5000 }) | Coupon 생성, 자동 코드(CF-XXXXXXXX) 발급 | P0 |
| P-CPN-03 | 생성 | 쿠폰 생성 (정률) | 1. discountType: "PERCENTAGE", discountValue: 10 | 10% 할인 쿠폰 생성 | P1 |
| P-CPN-04 | 생성 | 100% 초과 할인율 거부 | 1. discountType: "PERCENTAGE", discountValue: 101 | "할인율은 100%를 초과할 수 없습니다." | P1 |
| P-CPN-05 | 생성 | 중복 쿠폰 코드 거부 | 1. 이미 존재하는 code | "이미 사용 중인 쿠폰 코드입니다." | P0 |
| P-CPN-06 | 생성 | 이름 미입력 거부 | 1. name="" | "쿠폰 이름을 입력하세요." | P1 |
| P-CPN-07 | 수정 | 쿠폰 수정 | 1. updateCoupon(couponId, data) | Coupon 업데이트 | P1 |
| P-CPN-08 | 수정 | 타 파트너 쿠폰 수정 불가 | 1. 다른 파트너 couponId | "쿠폰을 찾을 수 없습니다." | P0 |
| P-CPN-09 | 활성화 | 쿠폰 활성화 토글 | 1. toggleCouponActive(couponId) | isActive 반전 | P1 |
| P-CPN-10 | 삭제 | 미사용 쿠폰 삭제 | 1. deleteCoupon(couponId), usedCount=0 | Coupon 삭제 | P1 |
| P-CPN-11 | 삭제 | 사용된 쿠폰 삭제 거부 | 1. usedCount > 0인 쿠폰 삭제 | "이미 사용된 쿠폰은 삭제할 수 없습니다." | P0 |

### 3.8 리뷰 관리

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| P-REV-01 | 목록 | 수집 리뷰 조회 | 1. /partner/reviews 접속 | CollectedReview 목록 (파트너 제품만) | P0 |
| P-REV-02 | 필터 | 특정 제품 리뷰 조회 | 1. getProductReviews(productId) | 해당 제품 리뷰만 필터 | P1 |
| P-REV-03 | 필터 | 타 파트너 제품 리뷰 조회 불가 | 1. 타 파트너 productId 지정 | 빈 배열 반환 | P0 |
| P-REV-04 | 통계 | 리뷰 통계 조회 | 1. getReviewStats() | averageRating, totalReviews, sentimentBreakdown, ratingDistribution | P1 |

### 3.9 매출 분석

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| P-ANL-01 | 매출 | 일별 매출 개요 | 1. /partner/analytics 접속 2. getSalesOverview("day") | totalRevenue, orderCount, avgOrderValue, delta%, chartData(7일) | P0 |
| P-ANL-02 | 매출 | 주별 매출 개요 | 1. getSalesOverview("week") | chartData(4주) | P1 |
| P-ANL-03 | 매출 | 월별 매출 개요 | 1. getSalesOverview("month") | chartData(6개월) | P1 |
| P-ANL-04 | 제품 | 제품별 성과 | 1. getProductPerformance() | viewCount, cartCount, purchaseCount, cartRate, purchaseRate, revenue | P0 |
| P-ANL-05 | 제품 | 상위 제품 | 1. /partner/analytics/products 접속 2. getTopProducts(5) | 매출 TOP 5 제품 | P1 |
| P-ANL-06 | FIT | FIT Score 분포 | 1. getFitScoreDistribution() | partnerAverage, platformAverage, distribution(5구간), totalCompares | P1 |
| P-ANL-07 | 빈 데이터 | 제품 없을 때 | 1. 제품 미등록 파트너 매출 조회 | 모든 값 0 반환 | P2 |

### 3.10 설정

| ID | 분류 | 시나리오명 | 단계 | 기대결과 | 우선순위 |
|----|------|-----------|------|---------|---------|
| P-SET-01 | 조회 | 설정 정보 조회 | 1. /partner/settings 접속 | companyName, businessNumber, contactEmail, status, tier 표시 | P0 |
| P-SET-02 | 기본 | 기본 정보 수정 | 1. updateBasicInfo({ companyName, representativeName, contactEmail, contactPhone }) | Partner 업데이트 | P0 |
| P-SET-03 | 기본 | 빈 회사명 거부 | 1. companyName="" | "회사명을 입력해주세요." | P1 |
| P-SET-04 | 기본 | 잘못된 이메일 거부 | 1. contactEmail="invalid" | "올바른 이메일 형식을 입력해주세요." | P1 |
| P-SET-05 | 연락처 | 연락처 정보 수정 | 1. updateContactInfo({ mobile, email, officePhone, officeAddress }) | contactInfo JSON 업데이트 | P1 |
| P-SET-06 | 담당자 | 담당자 정보 수정 | 1. updateManagerInfo({ name, department, position }) | managerInfo JSON 업데이트 | P1 |
| P-SET-07 | 세금 | 세금계산서 정보 수정 | 1. updateTaxInfo({ taxEmail, taxEmailSecondary, bizDocUrl }) | taxInfo JSON 업데이트 | P1 |
| P-SET-08 | 세금 | 세금 이메일 미입력 거부 | 1. taxEmail="" | "세금계산서 수신 이메일을 올바르게 입력해주세요." | P1 |
| P-SET-09 | 세금 | 보조 이메일 형식 오류 거부 | 1. taxEmailSecondary="invalid" | "보조 이메일 형식이 올바르지 않습니다." | P2 |

## 4. 테스트 데이터

### 4.1 테스트 계정
| 계정 | 이메일 | 비밀번호 | 역할 |
|------|--------|---------|------|
| 테스트 파트너 | partner@cosfit.kr | Partner1234! | PARTNER |
| 테스트 파트너2 | partner2@cosfit.kr | Partner1234! | PARTNER (타 파트너 격리 테스트용) |

### 4.2 시드 데이터
- Partner 1개 + PartnerProduct 연동
- ProductMaster 12개 (ACTIVE 상태)
- ProductVariant / ProductImage / ProductDescription 샘플

## 5. 환경 설정

### 5.1 접근 URL
- 로컬: http://localhost:3000/partner/login
- AWS: https://bmiitfnuq9.ap-northeast-1.awsapprunner.com/partner/login

### 5.2 파트너 데이터 격리 검증
모든 서버 액션에서 `getAuthenticatedPartnerId()` 호출로 세션 기반 partnerId를 사용하며, 클라이언트에서 partnerId를 전달하지 않음. 타 파트너 데이터 접근 불가를 반드시 검증할 것.
