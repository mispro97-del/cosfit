# COSFIT 사용자 서비스 고도화 계획

## 1. 개요

사용자가 화장품을 쉽게 등록하고, AI 기반 분석을 통해 초개인화 추천을 받는 경험을 고도화한다.

## 2. 핵심 기능

### 2.1 사진 기반 제품 등록 (Photo Registration)
- **바코드 스캔**: 카메라로 바코드 촬영 → DB 자동 매칭
- **제품 사진 인식**: 제품 이미지 촬영 → AI(OpenAI Vision) 분석 → 제품명/브랜드 자동 추출
- **수동 검색 보완**: AI 인식 실패 시 텍스트 검색 fallback
- **사용 기간/만족도 입력**: 등록 시 사용 기간, 별점, 한줄평 수집

**기술 스택**: OpenAI Vision API, 바코드 라이브러리(quagga2/zxing), Next.js Camera API

### 2.2 제품 궁합 분석 (Compatibility Analysis)
- **기존 FIT Score 엔진 활용**: `src/lib/analysis/fit-score.ts` (v3 Safety-First)
- **다중 제품 궁합**: 현재 사용 중인 제품들 간 성분 충돌/시너지 분석
- **루틴 분석**: 아침/저녁 루틴 전체의 성분 밸런스 점검
- **결과 시각화**: 성분 충돌 경고, 시너지 하이라이트, 개선 제안

### 2.3 차기 구매 추천 (Next-Purchase Recommendation)
- **부족 성분 분석**: 현재 루틴에서 부족한 성분 카테고리 식별
- **교체 시기 알림**: 사용 기간 기반 리필/교체 추천
- **개인화 추천 로직**: UserStandard + 사용 이력 + FIT Score 종합
- **파트너 제품 연동**: 추천 시 입점 파트너 제품 우선 노출

### 2.4 초개인화 UX
- **홈 대시보드 리뉴얼**: 내 피부 상태 요약, 오늘의 추천, 루틴 현황
- **피부 변화 트래킹**: 주기적 피부 상태 입력 → 변화 그래프
- **성분 사전**: 성분명 탭 시 효능/주의사항 팝업
- **알림/리마인더**: 제품 교체 시기, 새 추천 알림

## 3. 우선순위 (MoSCoW)

| 우선순위 | 기능 | 근거 |
|---------|------|------|
| **Must** | 사진/바코드 제품 등록 | 핵심 진입 장벽 해소 |
| **Must** | 제품 궁합 분석 | 기존 FIT Score 확장 |
| **Should** | 차기 구매 추천 | 리텐션 + 파트너 매출 |
| **Should** | 홈 대시보드 리뉴얼 | UX 개선 |
| **Could** | 피부 변화 트래킹 | 장기 사용자 가치 |
| **Could** | 알림/리마인더 | 재방문 유도 |

## 4. 데이터 모델 변경

### 신규 모델
```prisma
model UserProduct {
  id            String   @id @default(cuid())
  userId        String
  productId     String
  registeredAt  DateTime @default(now())
  usagePeriod   Int?        // 사용 기간 (월)
  rating        Float?      // 별점 1-5
  review        String?     // 한줄평
  isCurrentUse  Boolean  @default(true)
  routineType   String?     // MORNING / EVENING / BOTH
  routineOrder  Int?        // 루틴 내 순서

  user    User          @relation(fields: [userId], references: [id])
  product ProductMaster @relation(fields: [productId], references: [id])

  @@unique([userId, productId])
}

model RoutineAnalysis {
  id           String   @id @default(cuid())
  userId       String
  analyzedAt   DateTime @default(now())
  routineType  String   // MORNING / EVENING
  resultJson   Json     // 분석 결과 (충돌, 시너지, 개선제안)
  overallScore Float    // 루틴 종합 점수

  user User @relation(fields: [userId], references: [id])
}

model ProductRecommendation {
  id           String   @id @default(cuid())
  userId       String
  productId    String
  reason       String   // 추천 사유
  fitScore     Float
  priority     Int      // 추천 순위
  createdAt    DateTime @default(now())
  isViewed     Boolean  @default(false)
  isPurchased  Boolean  @default(false)

  user    User          @relation(fields: [userId], references: [id])
  product ProductMaster @relation(fields: [productId], references: [id])
}
```

## 5. API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/products/scan` | 바코드/이미지 스캔 → 제품 식별 |
| POST | `/api/v1/user/products` | 내 제품 등록 |
| GET | `/api/v1/user/products` | 내 제품 목록 |
| DELETE | `/api/v1/user/products/:id` | 제품 삭제 |
| POST | `/api/v1/user/routine/analyze` | 루틴 궁합 분석 |
| GET | `/api/v1/user/recommendations` | 추천 제품 목록 |

## 6. 페이지 구조

```
src/app/(user)/
├── home/                  # 대시보드 (리뉴얼)
├── my-products/
│   ├── page.tsx           # 내 제품 목록
│   ├── add/page.tsx       # 제품 등록 (사진/바코드/검색)
│   └── [id]/page.tsx      # 제품 상세
├── routine/
│   ├── page.tsx           # 루틴 관리
│   └── analysis/page.tsx  # 궁합 분석 결과
├── recommendations/
│   └── page.tsx           # 추천 제품
└── ingredients/
    └── [id]/page.tsx      # 성분 사전
```

## 7. 구현 단계

### Phase 1 (1주차): 제품 등록 기본
- UserProduct 모델 + migration
- 텍스트 검색 기반 제품 등록 UI
- 내 제품 목록/삭제

### Phase 2 (2주차): AI 이미지 인식
- OpenAI Vision API 연동
- 바코드 스캔 (quagga2)
- 카메라 촬영 → 제품 자동 매칭

### Phase 3 (3주차): 궁합 분석
- 루틴 관리 UI
- FIT Score 엔진 확장 (다중 제품)
- 성분 충돌/시너지 분석 로직

### Phase 4 (4주차): 추천 시스템
- 추천 알고리즘 (부족 성분 + FIT Score)
- 추천 UI + 파트너 제품 연동
- 홈 대시보드 리뉴얼
