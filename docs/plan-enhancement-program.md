# COSFIT 서비스 고도화 종합 프로그램

## 1. 프로그램 개요

| 항목 | 내용 |
|------|------|
| **프로젝트** | COSFIT 초개인화 뷰티 플랫폼 고도화 |
| **목표** | 사용자 경험 강화 + 데이터 품질 향상 + 오픈마켓 기능 구축 |
| **구성** | 3개 파트 (사용자 / 관리자 / 파트너) |
| **총 기간** | 8주 (병렬 진행) |

## 2. 파트별 요약

### Part 1: 사용자 서비스 고도화
→ [상세 계획](plan-user-enhancement.md)
- 사진/바코드 기반 제품 등록
- AI 이미지 인식 (OpenAI Vision)
- 루틴 궁합 분석 (FIT Score 확장)
- 차기 구매 추천 시스템
- 홈 대시보드 리뉴얼

### Part 2: 관리자 데이터 고도화
→ [상세 계획](plan-admin-data-enhancement.md)
- 성분 DB 정제 (동의어, 상호작용)
- 온라인 리뷰 수집 및 감성 분석
- 데이터 품질 대시보드
- ETL 파이프라인 자동화

### Part 3: 파트너 오픈마켓
→ [상세 계획](plan-partner-marketplace.md)
- 제품 상세 페이지 (PDP)
- 가격/재고 관리
- 쿠폰/프로모션 시스템
- 매출 분석 대시보드

## 3. 통합 로드맵

```
Week 1-2: Foundation (기반 구축)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[사용자] 제품 등록 기본 (UserProduct 모델, 검색 등록 UI)
[관리자] 성분 DB 정제 (동의어, 상호작용 모델 & UI)
[파트너] 제품 관리 기본 (Variant, Image, Description & 등록 UI)

Week 3-4: Core Features (핵심 기능)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[사용자] AI 이미지 인식 + 바코드 스캔
[관리자] 리뷰 수집 엔진 + 감성 분석
[파트너] 가격 관리 + 재고 관리

Week 5-6: Advanced Features (고급 기능)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[사용자] 루틴 궁합 분석 + 추천 시스템
[관리자] 데이터 품질 대시보드
[파트너] 쿠폰/프로모션 시스템

Week 7-8: Polish & Integration (마무리)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[사용자] 홈 대시보드 리뉴얼 + 파트너 제품 연동
[관리자] ETL 파이프라인 자동화
[파트너] 매출 분석 + 리뷰 관리
[통합] 추천 ↔ 파트너 제품 연동, FIT Score ↔ PDP 연동
```

## 4. 파트 간 의존성

```
관리자: 성분 DB 정제 ──→ 사용자: 궁합 분석 정확도 향상
         │
         └──→ 사용자: FIT Score 기반 추천 정확도 향상

파트너: 제품 등록 (PDP) ──→ 사용자: 쇼핑 제품 상세 페이지
         │
         └──→ 사용자: 추천 시 파트너 제품 연동

관리자: 리뷰 수집 ──→ 파트너: 제품 리뷰 데이터 제공
                  └──→ 사용자: 제품 선택 시 리뷰 참고
```

**핵심 의존**: 관리자 성분 DB 정제(Week 1-2)가 사용자 궁합 분석(Week 5-6)보다 선행

## 5. DB Migration 순서

| 순서 | Migration | 파트 | 모델 |
|------|-----------|------|------|
| 1 | `add_user_products` | 사용자 | UserProduct |
| 2 | `add_ingredient_relations` | 관리자 | IngredientSynonym, IngredientInteraction |
| 3 | `add_product_variants` | 파트너 | ProductVariant, ProductImage, ProductDescription |
| 4 | `add_review_collection` | 관리자 | ProductReview, ProductTrend |
| 5 | `add_routine_analysis` | 사용자 | RoutineAnalysis, ProductRecommendation |
| 6 | `add_pricing_inventory` | 파트너 | PriceHistory, InventoryLog |
| 7 | `add_promotions` | 파트너 | Coupon, CouponUsage, Promotion, PromotionProduct |
| 8 | `add_data_quality` | 관리자 | DataQualityLog |

## 6. 기술 스택 추가

| 기능 | 기술 |
|------|------|
| 이미지 인식 | OpenAI Vision API (GPT-4o) |
| 바코드 스캔 | quagga2 또는 @nicolo-ribaudo/zxing-wasm |
| 리뷰 수집 | Cheerio (서버사이드 HTML 파싱) |
| 감성 분석 | OpenAI GPT-4o-mini |
| 이미지 저장 | AWS S3 (기존 infra) |
| 리치 에디터 | Tiptap 또는 react-quill |
| 차트/분석 | Recharts |
| 스케줄러 | node-cron 또는 AWS EventBridge |

## 7. 구현 전략

### 병렬 작업 분배
3개 파트는 독립적으로 병렬 진행 가능하며, 각 파트별 서브에이전트에 위임:

1. **사용자 파트**: UI 중심 개발 (페이지 + API + AI 연동)
2. **관리자 파트**: 데이터/백엔드 중심 (모델 + 수집 로직 + 관리 UI)
3. **파트너 파트**: 커머스 기능 (제품 관리 + 주문 확장 + 분석)

### Week 1-2 착수 항목 (즉시 시작)
1. Prisma 스키마 확장 (UserProduct, IngredientSynonym, ProductVariant 등)
2. DB Migration 실행
3. 각 파트 기본 CRUD API + UI 구현

## 8. 성공 지표

| 지표 | 목표 |
|------|------|
| 제품 등록 전환율 | 사진 촬영 → 등록 완료 70%+ |
| 성분 DB 커버리지 | 동의어 매핑 90%+, 상호작용 데이터 500+ |
| 파트너 제품 등록 | PDP 완성도 (이미지+설명+가격) 100% |
| FIT Score 정확도 | 성분 상호작용 반영 후 정확도 향상 |
| 파트너 매출 | 월 거래액 추적 시작 |
