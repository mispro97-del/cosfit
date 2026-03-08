# COSFIT 파트너 오픈마켓 고도화 계획

## 1. 개요

입점 파트너가 자체적으로 제품을 홍보하고 판매할 수 있는 오픈마켓 기능을 구축한다. 쿠팡/네이버 스마트스토어 수준의 제품 상세페이지, 가격 관리, 재고 관리, 프로모션 기능을 제공한다.

## 2. 핵심 기능

### 2.1 제품 상세 페이지 (PDP)
- **리치 에디터**: 마크다운/위지윅 기반 제품 설명 편집
- **이미지 갤러리**: 메인 이미지 + 상세 이미지 (최대 10장)
- **성분 정보 표시**: DB 연동 성분 목록 + FIT Score 배지
- **리뷰 섹션**: 구매자 리뷰 + 별점
- **유사 제품 비교**: 같은 카테고리 내 FIT Score 비교

**참고 벤치마크**: 쿠팡 제품 상세, 네이버 스마트스토어 에디터

### 2.2 가격 관리
- **정가/할인가**: 정가, 할인율, 할인가 관리
- **기간 한정 할인**: 시작/종료일 설정
- **수량 할인**: 2개 이상 구매 시 추가 할인
- **가격 변동 이력**: 가격 변경 로그
- **경쟁가 참고**: 동일 제품 타 입점사 가격 노출 (선택)

### 2.3 재고 관리
- **SKU 관리**: 옵션별(용량, 색상) SKU 관리
- **재고 수량 추적**: 입고/출고/현재 재고
- **재고 부족 알림**: 설정 임계값 이하 시 알림
- **품절 자동 처리**: 재고 0 → 자동 품절 표시

### 2.4 프로모션/마케팅
- **쿠폰 생성**: 할인 쿠폰 (정액/정률, 최소 구매액, 유효기간)
- **기획전 참여**: 관리자가 만든 기획전에 제품 등록
- **타임딜**: 시간 한정 특가
- **번들 상품**: 세트 구성 할인

### 2.5 파트너 대시보드 강화
- **매출 분석**: 일/주/월 매출, 주문 건수, 평균 객단가
- **제품별 성과**: 조회수, 장바구니 담기율, 구매 전환율
- **FIT Score 분석**: 내 제품의 FIT Score 분포, 높은 매칭 사용자 수
- **리뷰 관리**: 리뷰 답글, 별점 트렌드

## 3. 우선순위 (MoSCoW)

| 우선순위 | 기능 | 근거 |
|---------|------|------|
| **Must** | 제품 상세 페이지 (PDP) | 판매 기본 기능 |
| **Must** | 가격 관리 (정가/할인가) | 판매 기본 기능 |
| **Must** | 재고 관리 기본 | 주문 처리 필수 |
| **Should** | 매출/성과 대시보드 | 파트너 의사결정 |
| **Should** | 쿠폰/프로모션 기본 | 마케팅 도구 |
| **Could** | 타임딜/번들 | 고급 마케팅 |
| **Could** | 경쟁가 분석 | 차별화 기능 |

## 4. 데이터 모델 변경

### 신규/확장 모델
```prisma
model ProductVariant {
  id            String   @id @default(cuid())
  partnerProductId String
  sku           String   @unique
  optionName    String      // "50ml", "100ml", "밝은 베이지"
  optionType    String      // SIZE, COLOR, TYPE
  price         Int         // 판매가 (원)
  originalPrice Int?        // 정가
  stock         Int      @default(0)
  lowStockAlert Int      @default(5)  // 재고 부족 알림 임계값
  isActive      Boolean  @default(true)

  partnerProduct PartnerProduct @relation(fields: [partnerProductId], references: [id])
  orderItems     OrderItem[]
}

model ProductImage {
  id            String   @id @default(cuid())
  partnerProductId String
  imageUrl      String
  sortOrder     Int      @default(0)
  isMain        Boolean  @default(false)
  alt           String?

  partnerProduct PartnerProduct @relation(fields: [partnerProductId], references: [id])
}

model ProductDescription {
  id            String   @id @default(cuid())
  partnerProductId String @unique
  content       String      // 리치 텍스트 (HTML/마크다운)
  shortDesc     String?     // 요약 설명
  highlights    Json?       // 특장점 리스트

  partnerProduct PartnerProduct @relation(fields: [partnerProductId], references: [id])
}

model PriceHistory {
  id            String   @id @default(cuid())
  variantId     String
  oldPrice      Int
  newPrice      Int
  changedAt     DateTime @default(now())
  reason        String?

  variant ProductVariant @relation(fields: [variantId], references: [id])
}

model Coupon {
  id            String   @id @default(cuid())
  partnerId     String
  code          String   @unique
  name          String
  discountType  String      // FIXED, PERCENTAGE
  discountValue Int         // 할인액 or 할인율(%)
  minOrderAmount Int?       // 최소 주문액
  maxDiscount   Int?        // 최대 할인액 (정률 시)
  usageLimit    Int?        // 총 사용 가능 횟수
  usedCount     Int      @default(0)
  startDate     DateTime
  endDate       DateTime
  isActive      Boolean  @default(true)

  partner Partner @relation(fields: [partnerId], references: [id])
  usages  CouponUsage[]
}

model CouponUsage {
  id        String   @id @default(cuid())
  couponId  String
  userId    String
  orderId   String?
  usedAt    DateTime @default(now())

  coupon Coupon @relation(fields: [couponId], references: [id])
  user   User   @relation(fields: [userId], references: [id])
}

model Promotion {
  id            String   @id @default(cuid())
  partnerId     String
  type          String      // TIMEDEAL, BUNDLE, EVENT
  title         String
  startDate     DateTime
  endDate       DateTime
  config        Json        // 프로모션별 설정 데이터
  isActive      Boolean  @default(true)

  partner  Partner             @relation(fields: [partnerId], references: [id])
  products PromotionProduct[]
}

model PromotionProduct {
  id          String   @id @default(cuid())
  promotionId String
  partnerProductId String
  specialPrice Int?

  promotion      Promotion      @relation(fields: [promotionId], references: [id])
  partnerProduct PartnerProduct @relation(fields: [partnerProductId], references: [id])

  @@unique([promotionId, partnerProductId])
}

model InventoryLog {
  id        String   @id @default(cuid())
  variantId String
  type      String      // IN, OUT, ADJUST
  quantity  Int
  reason    String?
  createdAt DateTime @default(now())

  variant ProductVariant @relation(fields: [variantId], references: [id])
}
```

### PartnerProduct 확장 필드
```prisma
// 기존 PartnerProduct에 추가
model PartnerProduct {
  // ... 기존 필드
  viewCount       Int      @default(0)
  cartCount       Int      @default(0)
  purchaseCount   Int      @default(0)

  variants     ProductVariant[]
  images       ProductImage[]
  description  ProductDescription?
  promotions   PromotionProduct[]
}
```

## 5. 파트너 관리 페이지 구조

```
src/app/partner/
├── dashboard/page.tsx        # 대시보드 (매출, 주문, 성과 요약)
├── products/
│   ├── page.tsx              # 제품 목록
│   ├── new/page.tsx          # 신규 제품 등록
│   └── [id]/
│       ├── page.tsx          # 제품 상세 편집
│       ├── variants/page.tsx # SKU/옵션 관리
│       ├── images/page.tsx   # 이미지 관리
│       └── pricing/page.tsx  # 가격 관리
├── inventory/
│   └── page.tsx              # 재고 현황/관리
├── orders/page.tsx           # 주문 관리 (기존 확장)
├── promotions/
│   ├── page.tsx              # 프로모션 목록
│   ├── coupons/page.tsx      # 쿠폰 관리
│   └── new/page.tsx          # 프로모션 생성
├── analytics/
│   ├── page.tsx              # 매출 분석
│   └── products/page.tsx     # 제품별 성과
├── reviews/
│   └── page.tsx              # 리뷰 관리/답글
└── settings/page.tsx         # 설정 (기존)
```

## 6. 사용자 쇼핑 페이지 구조

```
src/app/(user)/shop/
├── page.tsx                  # 쇼핑 메인 (카테고리, 추천)
├── [productId]/page.tsx      # 제품 상세 페이지 (PDP)
├── cart/page.tsx             # 장바구니 (기존 확장)
└── search/page.tsx           # 제품 검색
```

## 7. API 엔드포인트

### 파트너 API
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/partner/products` | 제품 등록 |
| PUT | `/api/partner/products/:id` | 제품 수정 |
| POST | `/api/partner/products/:id/variants` | SKU 추가 |
| PUT | `/api/partner/products/:id/variants/:vid` | SKU 수정 |
| POST | `/api/partner/products/:id/images` | 이미지 업로드 |
| PUT | `/api/partner/products/:id/description` | 상세 설명 수정 |
| GET | `/api/partner/inventory` | 재고 현황 |
| POST | `/api/partner/inventory/adjust` | 재고 조정 |
| POST | `/api/partner/coupons` | 쿠폰 생성 |
| GET | `/api/partner/analytics/sales` | 매출 분석 |
| GET | `/api/partner/analytics/products` | 제품 성과 |

### 사용자 쇼핑 API
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/shop/products/:id` | 제품 상세 (PDP) |
| GET | `/api/v1/shop/products` | 제품 목록/검색 |
| POST | `/api/v1/shop/cart` | 장바구니 추가 |
| POST | `/api/v1/coupons/apply` | 쿠폰 적용 |

## 8. 구현 단계

### Phase 1 (1~2주차): 제품 관리 기본
- ProductVariant, ProductImage, ProductDescription 모델 + migration
- 파트너: 제품 등록/수정 UI (기본 정보 + 이미지)
- 사용자: 제품 상세 페이지 (PDP) 기본

### Phase 2 (3주차): 가격 & 재고
- PriceHistory, InventoryLog 모델 + migration
- 가격 관리 UI (정가/할인가/기간 할인)
- 재고 관리 UI + 부족 알림
- SKU별 옵션 관리

### Phase 3 (4주차): 프로모션 & 쿠폰
- Coupon, CouponUsage, Promotion 모델 + migration
- 쿠폰 생성/관리 UI
- 쿠폰 적용 로직 (주문 시)
- 기본 프로모션 (기간 할인)

### Phase 4 (5주차): 분석 & 대시보드
- 매출 분석 대시보드
- 제품별 성과 (조회수, 전환율)
- FIT Score 기반 매칭 분석
- 리뷰 관리 UI
