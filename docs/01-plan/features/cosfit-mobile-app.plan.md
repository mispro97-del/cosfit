# COSFIT 하이브리드 모바일 앱 개발 Plan

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | COSFIT Flutter 하이브리드 모바일 앱 (Android + iOS) |
| 시작일 | 2026-03-08 |
| 목표일 | 2026-05-15 (약 10주) |
| 예상 기간 | 2-3개월 |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 모바일 웹만으로는 푸시 알림, 카메라/바코드 스캔, 오프라인 캐싱 등 네이티브 기능 제공 불가. 앱스토어 노출 부재로 사용자 획득 채널 제한 |
| **Solution** | Flutter 기반 하이브리드 앱으로 기존 Next.js 백엔드 API를 활용하면서 네이티브 UX 제공. WebView + 네이티브 위젯 혼합 전략 |
| **Function UX Effect** | 바코드 스캔으로 즉시 성분 분석, 푸시 알림으로 맞춤 추천 실시간 수신, 오프라인에서도 분석 이력 조회 가능 |
| **Core Value** | 앱스토어 양대 마켓 진출로 사용자 접점 확대 + 네이티브 기능으로 뷰티 분석 경험 극대화 |

---

## 1. 프로젝트 개요

### 1.1 배경
COSFIT은 AI 기반 초개인화 뷰티 플랫폼으로, 현재 Next.js 14 모바일 웹으로 운영 중이다. 기존 모바일 웹은 440px max-width 모바일 셸 디자인, 하단 내비게이션, safe-area 대응 등 모바일 최적화가 이미 적용되어 있으나, 네이티브 기능(푸시, 카메라, 오프라인) 제공이 불가하며 앱스토어 배포를 통한 사용자 획득 채널이 부재하다.

### 1.2 목표
- Android (Google Play) + iOS (App Store) 동시 출시
- Flutter 기반 하이브리드 앱 (WebView + 네이티브 화면 혼합)
- 4대 네이티브 기능: 푸시 알림, 카메라/바코드 스캔, 소셜 로그인, 오프라인 캐싱
- 기존 Next.js API 백엔드 100% 재활용
- **기존 모바일 웹 소스코드 무변경 원칙 (Zero Impact)**

### 1.3 범위

#### In-Scope
- Flutter 프로젝트 셋업 (Android + iOS) — **별도 디렉토리(`cosfit_app/`)**
- WebView 기반 기존 웹 화면 래핑 (라이브 URL 로딩 방식)
- 네이티브 바코드/카메라 스캔 화면
- FCM 푸시 알림 (Android + APNs)
- Google/Apple/Kakao 네이티브 소셜 로그인
- 오프라인 캐싱 (분석 이력, 프로필)
- 앱스토어 심사 및 배포
- CI/CD 파이프라인 (GitHub Actions) — 웹과 앱 파이프라인 완전 분리
- 웹 변경 사항 자동 감지 및 앱 호환성 검증 (Sync Guard)

#### Out-of-Scope
- 관리자/파트너 앱 (PC 기반이므로 웹 유지)
- 결제 시스템 네이티브 전환 (웹 결제 유지)
- **기존 웹 소스코드(`cosfit/src/`) 수정 — 절대 불가**
- **기존 CI/CD 파이프라인 변경 — 웹 배포는 현행 유지**

### 1.4 병행 운영 원칙

> **핵심: 모바일 웹은 계속 운영하며 사용자 테스트를 수행하고, 동시에 Flutter 앱을 별도로 개발한다.**

#### 원칙 1: 소스 완전 분리 (Zero Impact)
```
c:\CosfitProject\
├── cosfit/              ← 기존 웹 (절대 수정 안 함)
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   └── ...
│
├── cosfit_app/          ← Flutter 앱 (신규, 완전 독립)
│   ├── lib/
│   ├── android/
│   ├── ios/
│   ├── pubspec.yaml
│   └── ...
│
└── shared/              ← 공유 계약 (선택적)
    ├── api-contract.yaml    # OpenAPI 스펙 (API 호환성 보장)
    └── bridge-protocol.md   # WebView↔Native 통신 규약
```

- Flutter 앱은 `cosfit_app/` 별도 디렉토리에 생성
- 기존 `cosfit/` 디렉토리 내 파일은 **일체 수정하지 않음**
- Git 저장소도 분리 가능 (또는 모노레포 내 독립 워크스페이스)

#### 원칙 2: WebView는 라이브 URL을 로딩
```
WebView URL = https://bmiitfnuq9.ap-northeast-1.awsapprunner.com
              (또는 환경별: dev/staging/prod URL)
```

- WebView가 **빌드된 정적 파일이 아닌 라이브 서비스 URL**을 로딩
- 웹이 업데이트되면 앱의 WebView에도 **자동으로 반영됨**
- 앱 업데이트 없이 웹 변경 사항이 즉시 적용되는 구조

#### 원칙 3: 웹 변경 시 앱 호환성 보장 (Sync Guard)

모바일 웹이 개발 중 변경될 수 있으므로 다음 메커니즘으로 호환성을 보장한다:

```
┌──────────────────────────────────────────────────────┐
│                  Sync Guard System                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [웹 변경 감지]                                       │
│    ① API 계약 검증 (OpenAPI Spec Diff)                │
│    ② JS Bridge 인터페이스 회귀 테스트                  │
│    ③ WebView 렌더링 스모크 테스트                      │
│                                                      │
│  [알림 및 대응]                                       │
│    ④ 웹 배포 시 → 앱팀 Slack/GitHub 알림              │
│    ⑤ Breaking Change 감지 시 → 앱 CI 자동 트리거      │
│    ⑥ 호환성 리포트 자동 생성                           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

| 변경 유형 | 앱 영향도 | 대응 방식 |
|-----------|----------|-----------|
| 웹 UI/스타일 변경 | 없음 | WebView 자동 반영 |
| API 응답 필드 추가 | 없음 | 하위 호환, 무시 가능 |
| API 응답 필드 삭제/변경 | **높음** | API 버전 관리 (`/api/v1/` 유지) |
| JS Bridge 메시지 형식 변경 | **높음** | Bridge Protocol 버전 헤더 |
| 새 라우트 추가 | 낮음 | WebView 라우트 화이트리스트 갱신 |
| 인증 흐름 변경 | **높음** | 세션 동기화 레이어에서 흡수 |

#### 원칙 4: 병행 개발 Git 전략
```
GitHub Repositories:
  mispro97-del/cosfit         ← 웹 (기존, 독립 배포)
  mispro97-del/cosfit-app     ← Flutter 앱 (신규 저장소)

또는 모노레포:
  mispro97-del/cosfit (main)
    ├── web/    (기존 cosfit → 이름만 변경, 코드 무변경)
    └── app/    (신규 Flutter)
    └── shared/ (API 계약)
```

- **추천: 별도 저장소** — 웹과 앱의 CI/CD, 브랜치 전략, 릴리즈 주기가 완전히 다름
- 웹 저장소에는 어떠한 commit도 하지 않음 (신규 API만 예외)

#### 원칙 5: 신규 백엔드 API 추가 방식

웹 소스에 영향을 주지 않으면서 앱 전용 API를 추가하는 방법:

| 방식 | 설명 | 웹 영향 |
|------|------|---------|
| **A. 웹 프로젝트에 API 추가** (권장) | `cosfit/src/app/api/v1/notifications/` 등 새 파일만 추가. 기존 파일 수정 없음 | **없음** (파일 추가만) |
| B. 별도 API 서버 | 앱 전용 마이크로서비스 | 없음 |
| C. API Gateway 분리 | 앱 트래픽만 별도 라우팅 | 없음 |

> 방식 A 권장: 기존 Next.js API Routes에 **새 파일만 추가**하는 것은 기존 웹 소스 "수정"이 아님.
> 기존 파일의 코드는 한 줄도 변경하지 않으며, 새 엔드포인트 파일만 추가한다.

---

## 2. 기술 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────┐
│              Flutter App (Dart)              │
├──────────┬──────────┬───────────┬───────────┤
│ WebView  │ Native   │ Native    │ Native    │
│ (기존웹) │ Scanner  │ Auth      │ Push      │
├──────────┴──────────┴───────────┴───────────┤
│           Flutter Platform Channels          │
├──────────┬──────────┬───────────┬───────────┤
│ webview  │ camera/  │ google/   │ FCM/APNs  │
│ _flutter │ ml_kit   │ apple/    │           │
│          │          │ kakao SDK │           │
├──────────┴──────────┴───────────┴───────────┤
│        기존 Next.js API (App Runner)         │
│        bmiitfnuq9.ap-northeast-1...          │
└─────────────────────────────────────────────┘
```

### 2.2 화면 전략 (하이브리드)

| 화면 | 구현 방식 | 이유 |
|------|-----------|------|
| 홈, 비교, 이력, 마이페이지 | **WebView** | 기존 모바일 최적화 완료, 빠른 전환 |
| 온보딩 | **WebView** | 복잡한 폼 로직 재사용 |
| 바코드 스캔 | **Flutter Native** | 카메라 접근 + ML Kit 필요 |
| 로그인/소셜 로그인 | **Flutter Native** | 네이티브 SDK 연동 필수 |
| 스플래시/인트로 | **Flutter Native** | 앱 첫인상, 네이티브 성능 |
| 설정 (알림, 캐시) | **Flutter Native** | 디바이스 설정 접근 필요 |
| 상품 상세 | **WebView** | 기존 UI 재사용 |
| 추천/루틴 | **WebView** | 기존 AI 분석 UI 재사용 |

### 2.3 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| Framework | Flutter | 3.22+ |
| Language | Dart | 3.4+ |
| WebView | webview_flutter | 4.x |
| 바코드 스캔 | google_ml_kit (barcode) | latest |
| 카메라 | camera | 0.11+ |
| 푸시 알림 | firebase_messaging | 15.x |
| 로컬 알림 | flutter_local_notifications | 17.x |
| 소셜 로그인 | google_sign_in, sign_in_with_apple, kakao_flutter_sdk | latest |
| 오프라인 저장 | hive / isar | latest |
| HTTP | dio | 5.x |
| 상태관리 | riverpod | 2.x |
| 라우팅 | go_router | 14.x |
| 딥링크 | app_links | 6.x |
| CI/CD | GitHub Actions + Fastlane | - |

---

## 3. 단계별 개발 계획

### Phase 1: 프로젝트 기반 구축 (Week 1-2)

| 작업 | 상세 | 담당 에이전트 |
|------|------|--------------|
| Flutter 프로젝트 생성 | `cosfit_app/` **별도 디렉토리**, 패키지 구조 설정 | **infra-architect** |
| 프로젝트 구조 설계 | feature-first 아키텍처 (`lib/features/`, `lib/core/`) | **frontend-architect** |
| 환경 설정 | dev/staging/prod 환경 분리, .env 관리 | **infra-architect** |
| Firebase 프로젝트 생성 | Android + iOS 앱 등록, google-services 설정 | **infra-architect** |
| CI/CD 파이프라인 | 앱 전용 GitHub Actions (**웹 CI/CD와 완전 분리**) + Fastlane | **infra-architect** |
| 코드 컨벤션 정의 | Dart lint rules, 네이밍, 폴더 구조 | **code-analyzer** |
| **Sync Guard 구축** | 웹 API 변경 감지, OpenAPI Spec 추출, 호환성 알림 파이프라인 | **infra-architect** |
| **API 계약서 작성** | 현재 웹 API 스펙을 OpenAPI YAML로 문서화 (v1 기준선) | **bkend-expert** |

### Phase 2: 핵심 인프라 개발 (Week 3-4)

| 작업 | 상세 | 담당 에이전트 |
|------|------|--------------|
| WebView 컨테이너 구현 | JavaScript Bridge, 쿠키/세션 동기화 | **frontend-architect** |
| 네이티브-웹 통신 레이어 | postMessage 프로토콜, 이벤트 핸들링 | **frontend-architect** |
| API 클라이언트 | Dio 기반, 인터셉터 (auth token, retry) | **bkend-expert** |
| 인증 흐름 설계 | JWT 토큰 관리, WebView↔Native 세션 공유 | **security-architect** |
| 라우팅 시스템 | go_router, WebView/Native 화면 전환 | **frontend-architect** |
| 디자인 시스템 (Dart) | 기존 Tailwind 토큰을 Flutter ThemeData로 변환 | **frontend-architect** |

### Phase 3: 네이티브 기능 구현 (Week 5-7)

| 작업 | 상세 | 담당 에이전트 |
|------|------|--------------|
| 소셜 로그인 (Google) | google_sign_in + 기존 NextAuth 연동 | **bkend-expert** |
| 소셜 로그인 (Apple) | sign_in_with_apple + 기존 NextAuth 연동 | **bkend-expert** |
| 소셜 로그인 (Kakao) | kakao_flutter_sdk + 기존 NextAuth 연동 | **bkend-expert** |
| 바코드 스캔 | google_ml_kit barcode → 제품 검색 API 연동 | **frontend-architect** |
| 카메라 촬영 | 제품 이미지 인식 → `/api/v1/products/recognize` | **frontend-architect** |
| 푸시 알림 (FCM) | Firebase Cloud Messaging, 토픽/개인 알림 | **infra-architect** |
| 푸시 알림 (백엔드) | 알림 발송 API 추가 (`/api/v1/notifications`) | **bkend-expert** |
| 오프라인 캐싱 | Hive/Isar로 분석 이력, 프로필, 즐겨찾기 저장 | **frontend-architect** |

### Phase 4: 통합 및 UI 완성 (Week 7-8)

| 작업 | 상세 | 담당 에이전트 |
|------|------|--------------|
| 스플래시/온보딩 화면 | 앱 진입 플로우, 권한 요청 | **frontend-architect** |
| 네이티브 설정 화면 | 알림 설정, 캐시 관리, 계정 관리 | **frontend-architect** |
| 딥링크 처리 | 공유 링크(`/share/[id]`) → 앱 내 라우팅 | **frontend-architect** |
| WebView ↔ Native 전환 | 바코드 스캔 결과 → 웹 상품 상세 등 | **frontend-architect** |
| 앱 아이콘/스플래시 | 플랫폼별 아이콘, 스플래시 스크린 생성 | **frontend-architect** |
| 다크 모드 지원 | 시스템 테마 연동, Flutter ThemeData | **frontend-architect** |

### Phase 5: 테스트 및 품질 보증 (Week 8-9)

| 작업 | 상세 | 담당 에이전트 |
|------|------|--------------|
| 단위 테스트 | 핵심 비즈니스 로직, API 클라이언트 | **qa-strategist** |
| 위젯 테스트 | 네이티브 화면 UI 테스트 | **qa-strategist** |
| 통합 테스트 | WebView↔Native 전환, 인증 플로우 | **qa-strategist** |
| 보안 검수 | 토큰 저장, API 통신, 딥링크 보안 | **security-architect** |
| 성능 최적화 | 앱 시작 시간, WebView 로딩, 메모리 | **code-analyzer** |
| 디바이스 호환성 | Android 8+, iOS 15+, 다양한 해상도 | **qa-monitor** |

### Phase 6: 스토어 배포 (Week 9-10)

| 작업 | 상세 | 담당 에이전트 |
|------|------|--------------|
| Google Play 등록 | 스토어 리스팅, 스크린샷, 개인정보처리방침 | **product-manager** |
| App Store 등록 | App Store Connect, 심사 가이드라인 준수 | **product-manager** |
| 앱 심사 대응 | 리젝 사유 분석 및 수정 | **product-manager** |
| 모니터링 설정 | Crashlytics, Analytics, 성능 모니터링 | **infra-architect** |
| 출시 및 운영 | 단계적 롤아웃, 피드백 수집 | **product-manager** |

---

## 4. 서브에이전트 정의

### 4.1 에이전트 역할 매핑

| 에이전트 | 역할 | 주요 담당 Phase |
|----------|------|----------------|
| **frontend-architect** | Flutter UI 아키텍처, 컴포넌트 설계, WebView 통합, 라우팅 | Phase 2, 3, 4 |
| **infra-architect** | 프로젝트 셋업, Firebase, CI/CD, 모니터링 | Phase 1, 3, 6 |
| **bkend-expert** | API 연동, 소셜 로그인 백엔드, 푸시 알림 API | Phase 2, 3 |
| **security-architect** | 인증 흐름, 토큰 보안, 딥링크 보안, 보안 검수 | Phase 2, 5 |
| **product-manager** | 앱스토어 등록, 심사 대응, 출시 전략 | Phase 6 |
| **qa-strategist** | 테스트 전략, 단위/위젯/통합 테스트 | Phase 5 |
| **code-analyzer** | 코드 품질, 성능 최적화, 컨벤션 검사 | Phase 1, 5 |
| **qa-monitor** | 디바이스 호환성, 런타임 이슈 모니터링 | Phase 5 |
| **gap-detector** | 설계-구현 Gap 분석 | Phase 5 (Check) |
| **report-generator** | PDCA 완료 보고서 생성 | Phase 6 (Report) |

### 4.2 에이전트 협업 흐름

```
Phase 1: infra-architect → frontend-architect → code-analyzer
              │
Phase 2: frontend-architect ←→ security-architect ←→ bkend-expert
              │
Phase 3: frontend-architect + bkend-expert + infra-architect (병렬)
              │
Phase 4: frontend-architect (통합)
              │
Phase 5: qa-strategist → qa-monitor → security-architect → gap-detector
              │
Phase 6: product-manager + infra-architect → report-generator
```

---

## 5. 프로젝트 구조 (예상)

```
cosfit_app/
├── lib/
│   ├── main.dart                    # 앱 진입점
│   ├── app.dart                     # MaterialApp, 라우터 설정
│   ├── core/
│   │   ├── config/                  # 환경 설정 (dev/staging/prod)
│   │   ├── theme/                   # Flutter ThemeData (Tailwind 토큰 변환)
│   │   ├── network/                 # Dio HTTP 클라이언트, 인터셉터
│   │   ├── storage/                 # Hive/Isar 오프라인 저장소
│   │   ├── auth/                    # 토큰 관리, 세션
│   │   └── router/                  # go_router 설정
│   ├── features/
│   │   ├── splash/                  # 스플래시 화면
│   │   ├── auth/                    # 로그인, 소셜 로그인
│   │   ├── webview/                 # WebView 컨테이너, JS Bridge
│   │   ├── scanner/                 # 바코드/카메라 스캔
│   │   ├── notifications/           # 푸시 알림 관리
│   │   └── settings/                # 앱 설정
│   └── shared/
│       ├── widgets/                 # 공통 위젯
│       └── utils/                   # 유틸리티
├── android/                         # Android 네이티브 설정
├── ios/                             # iOS 네이티브 설정
├── test/                            # 테스트
├── integration_test/                # 통합 테스트
├── assets/                          # 이미지, 폰트
├── fastlane/                        # 배포 자동화
├── pubspec.yaml                     # 의존성 정의
└── .github/workflows/
    ├── flutter-ci.yml               # CI (빌드, 테스트)
    └── flutter-deploy.yml           # CD (스토어 배포)
```

---

## 6. 백엔드 API 변경 사항

### 6.1 기존 API 재활용 (변경 없음)
- `POST /api/auth/[...nextauth]` — 인증
- `GET/POST /api/v1/products` — 제품
- `POST /api/v1/products/scan` — 바코드 스캔
- `POST /api/v1/products/recognize` — 이미지 인식
- `POST /api/v1/compare` — 비교 분석
- `GET /api/v1/compare/history` — 이력 조회

### 6.2 신규 API 추가 필요

| 엔드포인트 | 메서드 | 용도 |
|-----------|--------|------|
| `/api/v1/notifications/register` | POST | FCM 디바이스 토큰 등록 |
| `/api/v1/notifications/send` | POST | 푸시 알림 발송 (관리자) |
| `/api/v1/notifications/preferences` | GET/PUT | 알림 설정 조회/변경 |
| `/api/v1/auth/social/native` | POST | 네이티브 소셜 로그인 토큰 교환 |
| `/api/v1/sync/offline` | POST | 오프라인 데이터 동기화 |

---

## 7. 리스크 및 대응 전략

| 리스크 | 확률 | 영향 | 대응 전략 |
|--------|------|------|-----------|
| iOS 앱 심사 리젝 | 중 | 높음 | 심사 가이드라인 사전 검토, WebView 비율 관리 |
| WebView 성능 이슈 | 중 | 중 | 핵심 화면 네이티브 전환 준비, 캐싱 최적화 |
| 소셜 로그인 SDK 호환성 | 낮 | 중 | 각 SDK 최신 버전 사용, 폴백 웹 로그인 |
| Flutter 버전 업그레이드 | 낮 | 낮 | stable 채널 사용, 주기적 업그레이드 |
| 오프라인↔온라인 동기화 충돌 | 중 | 중 | 서버 우선 전략 + 충돌 알림 |
| 웹 API Breaking Change | 중 | 높음 | Sync Guard 자동 감지 + API v1 버전 고정 + OpenAPI Diff CI |
| 웹 UI 변경으로 WebView 깨짐 | 낮 | 중 | 라이브 URL 자동 반영. JS Bridge 인터페이스만 회귀 테스트 |
| 웹-앱 인증 세션 불일치 | 중 | 높음 | 토큰 기반 세션 동기화 레이어, WebView 쿠키 주입 |
| 앱 개발 중 웹 소스 실수 변경 | 낮 | 높음 | 별도 저장소 분리, cosfit/ 디렉토리 write-protect |
| 웹-앱 동시 배포 충돌 | 낮 | 중 | 배포 파이프라인 완전 분리, 웹 배포 시 앱팀 자동 알림 |

---

## 8. 성공 지표 (KPI)

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 앱 시작 시간 (Cold Start) | < 3초 | Firebase Performance |
| WebView 로딩 시간 | < 2초 | 앱 내 측정 |
| 크래시율 | < 1% | Crashlytics |
| 바코드 스캔 성공률 | > 95% | 앱 내 로깅 |
| 앱스토어 심사 통과 | 1차 통과 | 심사 결과 |
| 설치 후 7일 리텐션 | > 30% | Firebase Analytics |
| 오프라인 캐시 히트율 | > 80% | 앱 내 측정 |

---

## 9. 일정 요약

```
Week 1-2   ██████████ Phase 1: 프로젝트 기반 구축
Week 3-4   ██████████ Phase 2: 핵심 인프라 개발
Week 5-7   ███████████████ Phase 3: 네이티브 기능 구현
Week 7-8   ██████████ Phase 4: 통합 및 UI 완성
Week 8-9   ██████████ Phase 5: 테스트 및 품질 보증
Week 9-10  ██████████ Phase 6: 스토어 배포
```

---

*Created: 2026-03-08 | Feature: cosfit-mobile-app | Phase: Plan*
