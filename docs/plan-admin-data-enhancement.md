# COSFIT 관리자 데이터 고도화 계획

## 1. 개요

화장품 제품 데이터의 품질을 높이고, 온라인 리뷰/바이럴 데이터 수집 파이프라인을 구축하여 AI 분석의 정확도를 향상시킨다.

## 2. 핵심 기능

### 2.1 온라인 리뷰 데이터 수집
- **리뷰 크롤링 엔진**: 올리브영, 화해, 네이버 쇼핑 리뷰 수집
- **감성 분석**: OpenAI로 리뷰 텍스트 → 긍/부정/중립 + 피부타입별 평판
- **키워드 추출**: 리뷰에서 자주 언급되는 성분/효과 키워드 추출
- **데이터 정규화**: 수집 데이터 → 구조화된 제품 평판 데이터로 변환

### 2.2 바이럴 데이터 수집
- **SNS 트렌드 모니터링**: 인스타그램/유튜브 화장품 언급 트래킹
- **인플루언서 리뷰 수집**: 뷰티 인플루언서 제품 리뷰 데이터
- **트렌드 스코어**: 제품별 온라인 버즈량 기반 트렌드 점수 산출

### 2.3 성분 DB 정제
- **성분 동의어 통합**: 같은 성분의 다른 표기 통합 (예: 나이아신아마이드 = 니코틴아미드)
- **KFDA 연동 강화**: 기존 `src/lib/kfda/` 모듈 고도화
- **성분 상호작용 DB**: 성분 간 시너지/충돌 관계 데이터 구축
- **안전성 등급 갱신**: EWG/CIR 최신 데이터 반영

### 2.4 데이터 파이프라인 아키텍처
- **수집 스케줄러**: Cron 기반 자동 수집 (일/주/월 단위)
- **ETL 파이프라인**: 원시 데이터 → 정제 → 적재
- **데이터 품질 대시보드**: 누락률, 정합성, 최신성 모니터링
- **수동 보정 도구**: 관리자가 AI 정제 결과를 검토/수정

## 3. 우선순위 (MoSCoW)

| 우선순위 | 기능 | 근거 |
|---------|------|------|
| **Must** | 성분 DB 정제 (동의어, 상호작용) | FIT Score 정확도 직결 |
| **Must** | 성분 정규화 관리 UI | 관리자 작업 효율 |
| **Should** | 리뷰 데이터 수집 엔진 | 제품 평판 데이터 확보 |
| **Should** | 데이터 품질 대시보드 | 운영 모니터링 |
| **Could** | 바이럴 데이터 수집 | 트렌드 분석 |
| **Could** | 자동 ETL 파이프라인 | 운영 자동화 |

## 4. 데이터 모델 변경

### 신규 모델
```prisma
model IngredientSynonym {
  id            String   @id @default(cuid())
  ingredientId  String
  synonym       String      // 동의어 (다른 표기)
  language      String   @default("ko")  // ko, en, inci
  source        String?     // 출처

  ingredient Ingredient @relation(fields: [ingredientId], references: [id])

  @@unique([ingredientId, synonym])
}

model IngredientInteraction {
  id              String   @id @default(cuid())
  ingredientAId   String
  ingredientBId   String
  interactionType String   // SYNERGY, CONFLICT, NEUTRAL
  description     String?
  severity        Int?     // 충돌 심각도 1-5
  evidence        String?  // 근거 자료

  ingredientA Ingredient @relation("InteractionA", fields: [ingredientAId], references: [id])
  ingredientB Ingredient @relation("InteractionB", fields: [ingredientBId], references: [id])

  @@unique([ingredientAId, ingredientBId])
}

model ProductReview {
  id            String   @id @default(cuid())
  productId     String
  source        String      // OLIVEYOUNG, HWAHAE, NAVER, INSTAGRAM, YOUTUBE
  sourceUrl     String?
  content       String
  rating        Float?
  sentiment     String?     // POSITIVE, NEGATIVE, NEUTRAL
  skinType      String?     // 리뷰어 피부타입
  keywords      Json?       // 추출 키워드
  collectedAt   DateTime @default(now())

  product ProductMaster @relation(fields: [productId], references: [id])
}

model ProductTrend {
  id          String   @id @default(cuid())
  productId   String
  period      String      // 2026-W10, 2026-03
  buzzCount   Int         // 언급 수
  trendScore  Float       // 트렌드 점수
  sources     Json        // 소스별 카운트

  product ProductMaster @relation(fields: [productId], references: [id])

  @@unique([productId, period])
}

model DataQualityLog {
  id          String   @id @default(cuid())
  entityType  String      // PRODUCT, INGREDIENT, REVIEW
  totalCount  Int
  missingRate Float       // 누락률
  checkedAt   DateTime @default(now())
  details     Json?       // 상세 항목별 누락률
}
```

## 5. 관리자 페이지 구조

```
src/app/admin/
├── data-collection/       # 기존 데이터 수집 (KFDA)
├── ingredients/
│   ├── page.tsx           # 성분 목록 + 정규화 관리
│   ├── [id]/page.tsx      # 성분 상세 (동의어, 상호작용)
│   └── interactions/page.tsx  # 성분 상호작용 매트릭스
├── reviews/
│   ├── page.tsx           # 수집된 리뷰 목록
│   ├── collect/page.tsx   # 리뷰 수집 실행/설정
│   └── analysis/page.tsx  # 리뷰 감성 분석 대시보드
├── data-quality/
│   └── page.tsx           # 데이터 품질 대시보드
├── products/
│   └── page.tsx           # 제품 관리 (기존 확장)
└── users/
    └── page.tsx           # 사용자 관리 (기존)
```

## 6. API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/ingredients` | 성분 목록 (동의어 포함) |
| POST | `/api/admin/ingredients/:id/synonyms` | 동의어 추가 |
| POST | `/api/admin/ingredients/interactions` | 상호작용 등록 |
| POST | `/api/admin/reviews/collect` | 리뷰 수집 실행 |
| GET | `/api/admin/reviews` | 수집 리뷰 목록 |
| POST | `/api/admin/reviews/analyze` | 리뷰 감성 분석 실행 |
| GET | `/api/admin/data-quality` | 데이터 품질 현황 |

## 7. 구현 단계

### Phase 1 (1주차): 성분 DB 정제
- IngredientSynonym, IngredientInteraction 모델 + migration
- 성분 관리 UI (동의어 CRUD)
- 성분 상호작용 등록 UI

### Phase 2 (2주차): 리뷰 수집 엔진
- ProductReview 모델 + migration
- 올리브영/화해 리뷰 수집 모듈 (서버사이드)
- OpenAI 감성 분석 연동

### Phase 3 (3주차): 데이터 품질
- DataQualityLog 모델 + migration
- 데이터 품질 체크 로직
- 품질 대시보드 UI

### Phase 4 (4주차): 파이프라인 자동화
- Cron 기반 자동 수집 스케줄러
- ETL 로직 (정제 → 적재)
- 바이럴 트렌드 수집 (선택)
