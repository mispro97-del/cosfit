# COSFIT 하이브리드 모바일 앱 - Design Document

> Plan 문서: `docs/01-plan/features/cosfit-mobile-app.plan.md`
> Phase: Design | Feature: cosfit-mobile-app

---

## 1. 시스템 아키텍처

### 1.1 전체 시스템 구성도

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 디바이스                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Flutter App (cosfit_app/)               │  │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌───────────┐  │  │
│  │  │ Splash  │  │  Auth    │  │ Scanner │  │ Settings  │  │  │
│  │  │ Screen  │  │ (Native) │  │(Native) │  │ (Native)  │  │  │
│  │  └────┬────┘  └────┬─────┘  └────┬────┘  └─────┬─────┘  │  │
│  │       │            │             │              │         │  │
│  │  ┌────┴────────────┴─────────────┴──────────────┴─────┐  │  │
│  │  │              AppRouter (go_router)                  │  │  │
│  │  └────────────────────┬───────────────────────────────┘  │  │
│  │                       │                                   │  │
│  │  ┌────────────────────┴───────────────────────────────┐  │  │
│  │  │           WebView Container (핵심)                  │  │  │
│  │  │  ┌─────────────────────────────────────────────┐   │  │  │
│  │  │  │  webview_flutter                            │   │  │  │
│  │  │  │  - 라이브 URL 로딩                           │   │  │  │
│  │  │  │  - JS Bridge (postMessage)                  │   │  │  │
│  │  │  │  - 쿠키/세션 동기화                           │   │  │  │
│  │  │  │  - Navigation Intercept                     │   │  │  │
│  │  │  └─────────────────────────────────────────────┘   │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌─────────────────── Core Layer ─────────────────────┐  │  │
│  │  │ AuthManager │ ApiClient │ StorageManager │ PushMgr │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    기존 인프라 (변경 없음)                         │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  App Runner      │  │  RDS         │  │  Firebase         │  │
│  │  (Next.js API)   │  │  (PostgreSQL)│  │  (FCM, Analytics) │  │
│  │  :3000           │  │              │  │                    │  │
│  └──────────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 디렉토리 분리 원칙 (Zero Impact)

```
c:\CosfitProject\
│
├── cosfit/                    ← 기존 웹 (READ-ONLY, 절대 수정 금지)
│   ├── src/app/               # Next.js App Router
│   ├── src/lib/               # 비즈니스 로직
│   ├── prisma/                # DB 스키마
│   ├── .github/workflows/     # 웹 CI/CD (기존 유지)
│   └── ...
│
├── cosfit_app/                ← Flutter 앱 (신규 프로젝트)
│   ├── lib/                   # Dart 소스
│   ├── android/               # Android 설정
│   ├── ios/                   # iOS 설정
│   ├── test/                  # 테스트
│   ├── .github/workflows/     # 앱 전용 CI/CD
│   └── pubspec.yaml
│
└── shared/                    ← 웹-앱 공유 계약
    ├── api-contract.yaml      # OpenAPI v1 기준선
    ├── bridge-protocol.md     # JS Bridge 통신 규약
    └── sync-guard/            # 호환성 검증 스크립트
        ├── api-diff.sh
        └── bridge-test.sh
```

---

## 2. Flutter 프로젝트 상세 설계

### 2.1 패키지 구조 (Feature-First)

```
cosfit_app/lib/
├── main.dart                        # 앱 진입점
├── app.dart                         # MaterialApp + Router 설정
│
├── core/                            # 공통 인프라 레이어
│   ├── config/
│   │   ├── app_config.dart          # 환경별 설정 (dev/staging/prod)
│   │   ├── env.dart                 # 환경 변수 관리
│   │   └── constants.dart           # 상수 정의
│   │
│   ├── theme/
│   │   ├── app_theme.dart           # ThemeData (Light/Dark)
│   │   ├── app_colors.dart          # 색상 토큰 (Tailwind → Flutter)
│   │   ├── app_typography.dart      # 타이포그래피 (Noto Sans KR)
│   │   └── app_spacing.dart         # 간격/radius 토큰
│   │
│   ├── network/
│   │   ├── api_client.dart          # Dio 기반 HTTP 클라이언트
│   │   ├── api_interceptors.dart    # Auth, Retry, Logging 인터셉터
│   │   ├── api_endpoints.dart       # 엔드포인트 상수
│   │   └── api_response.dart        # 공통 응답 모델
│   │
│   ├── auth/
│   │   ├── auth_manager.dart        # 인증 상태 관리
│   │   ├── token_storage.dart       # 토큰 안전 저장 (flutter_secure_storage)
│   │   └── session_sync.dart        # WebView ↔ Native 세션 동기화
│   │
│   ├── storage/
│   │   ├── local_storage.dart       # Hive 초기화 및 관리
│   │   ├── cache_manager.dart       # 오프라인 캐시 정책
│   │   └── models/                  # 캐시 데이터 모델
│   │       ├── cached_profile.dart
│   │       ├── cached_history.dart
│   │       └── cached_product.dart
│   │
│   └── router/
│       ├── app_router.dart          # go_router 정의
│       ├── route_names.dart         # 라우트 이름 상수
│       └── route_guard.dart         # 인증 가드
│
├── features/                        # 기능별 모듈
│   ├── splash/
│   │   ├── splash_screen.dart       # 스플래시 + 초기화
│   │   └── splash_controller.dart   # 앱 초기화 로직
│   │
│   ├── auth/
│   │   ├── presentation/
│   │   │   ├── login_screen.dart    # 로그인 화면
│   │   │   └── widgets/
│   │   │       ├── social_login_button.dart
│   │   │       └── login_form.dart
│   │   ├── data/
│   │   │   ├── auth_repository.dart
│   │   │   └── social_auth_service.dart  # Google/Apple/Kakao
│   │   └── domain/
│   │       └── auth_state.dart
│   │
│   ├── webview/
│   │   ├── presentation/
│   │   │   ├── webview_screen.dart       # WebView 컨테이너
│   │   │   └── webview_bottom_nav.dart   # 하단 내비게이션
│   │   ├── data/
│   │   │   ├── js_bridge.dart            # JavaScript Bridge
│   │   │   ├── cookie_manager.dart       # 쿠키 동기화
│   │   │   └── navigation_handler.dart   # URL 인터셉트
│   │   └── domain/
│   │       ├── bridge_message.dart       # Bridge 메시지 모델
│   │       └── webview_config.dart       # WebView 설정
│   │
│   ├── scanner/
│   │   ├── presentation/
│   │   │   ├── scanner_screen.dart       # 바코드 스캔 화면
│   │   │   ├── camera_screen.dart        # 카메라 촬영 화면
│   │   │   └── scan_result_screen.dart   # 스캔 결과
│   │   └── data/
│   │       ├── barcode_service.dart      # ML Kit 바코드
│   │       └── image_recognition_service.dart
│   │
│   ├── notifications/
│   │   ├── push_service.dart             # FCM 핸들링
│   │   ├── notification_handler.dart     # 알림 탭 처리
│   │   └── notification_preferences.dart # 알림 설정
│   │
│   └── settings/
│       ├── presentation/
│       │   ├── settings_screen.dart      # 설정 메인
│       │   ├── notification_settings.dart
│       │   └── cache_settings.dart
│       └── data/
│           └── settings_repository.dart
│
└── shared/                          # 공유 위젯/유틸
    ├── widgets/
    │   ├── cosfit_app_bar.dart
    │   ├── cosfit_button.dart
    │   ├── loading_indicator.dart
    │   └── error_view.dart
    └── utils/
        ├── logger.dart
        └── platform_utils.dart
```

### 2.2 의존성 정의 (pubspec.yaml)

```yaml
name: cosfit_app
description: COSFIT 초개인화 뷰티 플랫폼
version: 1.0.0+1

environment:
  sdk: '>=3.4.0 <4.0.0'
  flutter: '>=3.22.0'

dependencies:
  flutter:
    sdk: flutter

  # UI
  cupertino_icons: ^1.0.8
  google_fonts: ^6.2.1              # Noto Sans KR

  # State Management
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5

  # Routing
  go_router: ^14.2.0

  # Network
  dio: ^5.5.0
  connectivity_plus: ^6.0.3         # 네트워크 상태 감지

  # WebView
  webview_flutter: ^4.8.0
  webview_cookie_manager: ^2.0.6    # 쿠키 동기화

  # Auth
  flutter_secure_storage: ^9.2.2    # 토큰 안전 저장
  google_sign_in: ^6.2.1            # Google 로그인
  sign_in_with_apple: ^6.1.1        # Apple 로그인
  kakao_flutter_sdk_user: ^1.9.5    # Kakao 로그인

  # Camera & Barcode
  camera: ^0.11.0
  google_mlkit_barcode_scanning: ^0.12.0

  # Push Notifications
  firebase_core: ^3.3.0
  firebase_messaging: ^15.0.4
  flutter_local_notifications: ^17.2.1

  # Offline Storage
  hive: ^2.2.3
  hive_flutter: ^1.1.0

  # Deep Links
  app_links: ^6.1.4

  # Utils
  permission_handler: ^11.3.1       # 권한 요청
  share_plus: ^9.0.0                # 공유 기능
  package_info_plus: ^8.0.0         # 앱 버전 정보

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  riverpod_generator: ^2.4.0
  build_runner: ^2.4.11
  hive_generator: ^2.0.1
  mockito: ^5.4.4
  integration_test:
    sdk: flutter
```

---

## 3. 핵심 컴포넌트 상세 설계

### 3.1 WebView Container (가장 중요)

WebView는 앱의 핵심이다. 기존 웹을 그대로 보여주되, 네이티브 기능과의 통신을 담당한다.

#### 3.1.1 WebView 설정

```
WebView Configuration:
┌─────────────────────────────────────────────────────┐
│ URL: {환경별 BASE_URL}                               │
│ JavaScript: enabled                                  │
│ DOM Storage: enabled                                 │
│ User-Agent: "CosflitApp/{version} (Flutter; {OS})"  │
│ Mixed Content: always allowed (개발환경)              │
│ Allow File Access: false (보안)                      │
│ Navigation Delegate: custom (URL 인터셉트)           │
└─────────────────────────────────────────────────────┘
```

#### 3.1.2 URL 라우팅 전략

```
┌────────────────────────────────────────────────────────────┐
│                  Navigation Handler                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  WebView 내부 URL 요청                                     │
│    │                                                       │
│    ├─ /login, /signup              → 네이티브 Auth 화면     │
│    ├─ /scan, /barcode              → 네이티브 Scanner 화면  │
│    ├─ /settings/notifications      → 네이티브 Settings      │
│    ├─ cosfit:// (커스텀 스킴)       → 네이티브 액션 처리     │
│    ├─ 외부 URL (http 외부 도메인)   → 외부 브라우저           │
│    └─ 그 외 내부 URL               → WebView에서 로딩       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 3.1.3 JavaScript Bridge Protocol

```
Bridge Protocol v1.0
────────────────────

방향: Web → Native (웹에서 앱으로)
─────────────────────────────────
Message Format:
{
  "type": "cosfit_bridge",
  "version": "1.0",
  "action": string,
  "payload": object,
  "requestId": string       // 응답 매핑용
}

Actions:
  "scan_barcode"         → 바코드 스캔 화면 열기
  "scan_camera"          → 카메라 촬영 화면 열기
  "get_device_token"     → FCM 토큰 반환
  "get_auth_token"       → 네이티브 저장 토큰 반환
  "set_auth_token"       → 토큰 저장 요청
  "open_settings"        → 네이티브 설정 화면
  "share"                → 네이티브 공유 시트
  "haptic"               → 햅틱 피드백
  "log"                  → 네이티브 로깅


방향: Native → Web (앱에서 웹으로)
─────────────────────────────────
Message Format:
{
  "type": "cosfit_bridge_response",
  "version": "1.0",
  "action": string,
  "payload": object,
  "requestId": string
}

Actions:
  "scan_result"          → 바코드/카메라 스캔 결과
  "auth_updated"         → 인증 상태 변경 알림
  "push_received"        → 푸시 알림 수신 (앱 포그라운드)
  "navigate"             → 웹 내비게이션 요청
```

#### 3.1.4 세션 동기화 흐름

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐
│ Native  │     │  Session    │     │   WebView    │
│  Auth   │     │  Sync Layer │     │  (Cookie)    │
└────┬────┘     └──────┬──────┘     └──────┬───────┘
     │                 │                    │
     │  로그인 성공     │                    │
     ├────────────────►│                    │
     │                 │  쿠키 주입          │
     │                 ├───────────────────►│
     │                 │  (next-auth.       │
     │                 │   session-token)   │
     │                 │                    │
     │                 │  WebView 리로드     │
     │                 ├───────────────────►│
     │                 │                    │
     │  토큰 갱신       │                    │
     ├────────────────►│                    │
     │                 │  쿠키 갱신          │
     │                 ├───────────────────►│
     │                 │                    │
     │                 │  웹에서 로그아웃     │
     │                 │◄───────────────────┤
     │  토큰 삭제       │                    │
     │◄────────────────┤                    │
     │                 │                    │
```

### 3.2 인증 시스템

#### 3.2.1 소셜 로그인 흐름

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐
│  User    │    │  Flutter     │    │  Provider    │    │ Next.js   │
│          │    │  Auth Screen │    │  (Google/    │    │ API       │
│          │    │              │    │  Apple/Kakao)│    │           │
└────┬─────┘    └──────┬───────┘    └──────┬───────┘    └─────┬─────┘
     │                 │                    │                  │
     │  소셜 버튼 탭    │                    │                  │
     ├────────────────►│                    │                  │
     │                 │  SDK 로그인 요청    │                  │
     │                 ├───────────────────►│                  │
     │                 │                    │                  │
     │  네이티브 동의   │                    │                  │
     ├────────────────►│                    │                  │
     │                 │  idToken 반환       │                  │
     │                 │◄───────────────────┤                  │
     │                 │                    │                  │
     │                 │  POST /api/v1/auth/social/native      │
     │                 │  { provider, idToken, profile }       │
     │                 ├──────────────────────────────────────►│
     │                 │                    │                  │
     │                 │  { accessToken, refreshToken,         │
     │                 │    sessionToken, user }               │
     │                 │◄──────────────────────────────────────┤
     │                 │                    │                  │
     │                 │  토큰 저장 (SecureStorage)             │
     │                 │  쿠키 주입 (WebView)                   │
     │                 │  홈 화면 이동                          │
     │◄────────────────┤                    │                  │
```

#### 3.2.2 토큰 관리 전략

```
Token Storage:
┌─────────────────────────────────────────────┐
│ flutter_secure_storage (암호화)              │
│                                             │
│  key: "access_token"   → JWT (1h 만료)      │
│  key: "refresh_token"  → JWT (7d 만료)      │
│  key: "session_token"  → NextAuth 세션 토큰  │
│  key: "user_profile"   → 사용자 기본 정보     │
└─────────────────────────────────────────────┘

Token Refresh Flow:
  API 요청 → 401 응답 → Dio Interceptor →
  refresh_token으로 갱신 → 재요청 (최대 1회)
  갱신 실패 → 로그인 화면으로 이동
```

### 3.3 바코드 스캔

```
Scanner Flow:
┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐
│ WebView │    │ Scanner      │    │ ML Kit       │    │ API       │
│ or Home │    │ Screen       │    │ Barcode      │    │           │
└────┬────┘    └──────┬───────┘    └──────┬───────┘    └─────┬─────┘
     │                │                    │                  │
     │  스캔 버튼 탭   │                    │                  │
     ├───────────────►│                    │                  │
     │                │  카메라 프리뷰 시작  │                  │
     │                ├───────────────────►│                  │
     │                │                    │                  │
     │                │  바코드 감지         │                  │
     │                │◄───────────────────┤                  │
     │                │                    │                  │
     │                │  POST /api/v1/products/scan            │
     │                │  { barcode: "8801234567890" }          │
     │                ├──────────────────────────────────────►│
     │                │                    │                  │
     │                │  제품 정보 반환                        │
     │                │◄──────────────────────────────────────┤
     │                │                    │                  │
     │  WebView로 결과 │                    │                  │
     │  전달 (제품상세) │                    │                  │
     │◄───────────────┤                    │                  │
```

### 3.4 푸시 알림

#### 3.4.1 FCM 아키텍처

```
Push Notification Flow:
┌───────────────┐    ┌───────────┐    ┌──────────────┐
│ Firebase      │    │ Flutter   │    │ Next.js API  │
│ Cloud         │    │ App       │    │              │
│ Messaging     │    │           │    │              │
└───────┬───────┘    └─────┬─────┘    └──────┬───────┘
        │                  │                  │
        │                  │  앱 시작 시       │
        │                  │  FCM 토큰 획득    │
        │◄─────────────────┤                  │
        │  토큰 반환        │                  │
        ├─────────────────►│                  │
        │                  │  POST /api/v1/notifications/register
        │                  │  { token, platform, userId }
        │                  ├─────────────────►│
        │                  │                  │  DB 저장
        │                  │                  │
        │                  │                  │
        │    서버에서 알림 발송                 │
        │◄─────────────────────────────────────┤
        │                  │                  │
        │  알림 전달        │                  │
        ├─────────────────►│                  │
        │                  │                  │
        │                  │  [포그라운드]      │
        │                  │  로컬 알림 표시    │
        │                  │                  │
        │                  │  [백그라운드]      │
        │                  │  시스템 알림 표시   │
        │                  │                  │
        │                  │  [알림 탭]         │
        │                  │  딥링크 라우팅     │
```

#### 3.4.2 알림 유형

| 유형 | 데이터 | 탭 시 동작 |
|------|--------|-----------|
| 분석 완료 | `{ type: "analysis_complete", productId }` | WebView → 분석 결과 페이지 |
| 성분 경고 | `{ type: "ingredient_alert", ingredientId }` | WebView → 성분 상세 |
| 프로모션 | `{ type: "promotion", url }` | WebView → 프로모션 페이지 |
| 루틴 리마인더 | `{ type: "routine_reminder", routineId }` | WebView → 루틴 페이지 |

### 3.5 오프라인 캐싱

```
Offline Cache Strategy:
┌──────────────────────────────────────────────────────────────┐
│                     Cache Manager                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [캐시 대상]                                                  │
│    ① 사용자 프로필 (skinType, allergies, preferences)         │
│    ② 분석 이력 (최근 20건)                                    │
│    ③ 즐겨찾기 제품 (productId, name, fitScore)               │
│    ④ 최근 검색 제품 (최근 10건)                               │
│                                                              │
│  [캐시 정책]                                                  │
│    - 저장소: Hive (경량, 빠른 읽기)                            │
│    - TTL: 24시간 (이후 자동 갱신 시도)                         │
│    - 동기화: 앱 시작 시 + 네트워크 복구 시                     │
│    - 충돌: 서버 우선 (Server Wins)                            │
│    - 최대 용량: 50MB (초과 시 오래된 항목 삭제)                │
│                                                              │
│  [오프라인 동작]                                              │
│    - 프로필 조회: ✅ 캐시에서 읽기                             │
│    - 분석 이력: ✅ 캐시에서 읽기                               │
│    - 새 분석 요청: ❌ 네트워크 필요 (안내 메시지)              │
│    - 제품 검색: ❌ 네트워크 필요 (안내 메시지)                 │
│    - 바코드 스캔: ❌ 네트워크 필요 (안내 메시지)               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. 환경 설정 설계

### 4.1 환경별 구성

```dart
// core/config/app_config.dart 설계

enum AppEnvironment { dev, staging, prod }

/*
  dev:
    baseUrl: http://localhost:3000
    webViewUrl: http://localhost:3000
    logLevel: verbose

  staging:
    baseUrl: https://staging.cosfit.kr
    webViewUrl: https://staging.cosfit.kr
    logLevel: info

  prod:
    baseUrl: https://bmiitfnuq9.ap-northeast-1.awsapprunner.com
    webViewUrl: https://bmiitfnuq9.ap-northeast-1.awsapprunner.com
    logLevel: error
*/
```

### 4.2 환경 변수 (.env)

```
# .env.dev / .env.staging / .env.prod
API_BASE_URL=https://...
WEBVIEW_BASE_URL=https://...
GOOGLE_CLIENT_ID_ANDROID=...
GOOGLE_CLIENT_ID_IOS=...
KAKAO_NATIVE_APP_KEY=...
FIREBASE_PROJECT_ID=cosfit-app
```

---

## 5. 라우팅 설계

### 5.1 라우트 맵

```
AppRouter Routes:
─────────────────────────────────────────────────────────

/splash                    → SplashScreen (앱 시작)
  │
  ├─ 인증 없음 ──────────► /auth/login       → LoginScreen
  │                        /auth/social/:provider
  │
  └─ 인증 있음 ──────────► /main             → MainShell (하단 탭)
                            ├─ /main/home      → WebView (/)
                            ├─ /main/compare   → WebView (/compare)
                            ├─ /main/history   → WebView (/history)
                            └─ /main/mypage    → WebView (/mypage)

/scanner                   → ScannerScreen (바코드)
/scanner/camera            → CameraScreen (촬영)
/scanner/result/:barcode   → ScanResultScreen

/settings                  → SettingsScreen
/settings/notifications    → NotificationSettingsScreen
/settings/cache            → CacheSettingsScreen

/webview?url=:encodedUrl   → WebViewScreen (범용)
```

### 5.2 하단 내비게이션 (Main Shell)

```
┌─────────────────────────────────────┐
│                                     │
│           WebView Content           │
│         (기존 웹 화면 표시)           │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  🏠 홈  │  🔍 비교  │  📋 이력  │ 👤 MY │
│  Home  │ Compare │ History │ MyPage│
└─────────────────────────────────────┘

탭 전환 시: WebView URL만 변경 (reload 없이 navigation)
현재 탭 재탭 시: WebView 스크롤 최상단 이동
```

---

## 6. Sync Guard 상세 설계

### 6.1 웹 변경 감지 파이프라인

```
┌────────────────────────────────────────────────────────────────┐
│               Sync Guard CI/CD Pipeline                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [Trigger] cosfit 웹 저장소에 push/deploy 발생                  │
│     │                                                          │
│     ▼                                                          │
│  [Step 1] API 스펙 비교                                        │
│     - 현재 API 라우트 스캔 → OpenAPI 스펙 자동 생성             │
│     - shared/api-contract.yaml 과 diff                         │
│     - Breaking Change 감지 (필드 삭제, 타입 변경, 삭제된 라우트) │
│     │                                                          │
│     ▼                                                          │
│  [Step 2] JS Bridge 호환성 테스트                               │
│     - bridge-protocol.md 기준 메시지 포맷 검증                  │
│     - postMessage 핸들러 존재 확인                              │
│     │                                                          │
│     ▼                                                          │
│  [Step 3] 결과 보고                                             │
│     ├─ Breaking Change 없음 → ✅ 호환성 리포트만 생성           │
│     └─ Breaking Change 있음 → ⚠️ GitHub Issue 자동 생성        │
│                                  + cosfit-app CI 트리거         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 6.2 API 버전 관리 규칙

```
규칙:
  1. 기존 /api/v1/* 엔드포인트는 절대 삭제하지 않는다
  2. 필드 추가는 허용 (하위 호환)
  3. 필드 삭제/변경 시 → /api/v2/* 신규 버전 생성
  4. 앱은 항상 /api/v1/ 을 호출 (v2 마이그레이션은 앱 업데이트로)
  5. v1 Deprecation은 최소 3개월 유예 기간
```

---

## 7. 신규 백엔드 API 상세 설계

> 주의: 기존 cosfit/ 소스의 기존 파일은 수정하지 않는다.
> 아래 API는 모두 **새 파일 추가**로만 구현한다.

### 7.1 FCM 디바이스 등록

```
POST /api/v1/notifications/register

Request:
{
  "token": "fcm-device-token-string",
  "platform": "android" | "ios",
  "appVersion": "1.0.0"
}

Response (201):
{
  "success": true,
  "deviceId": "uuid"
}

파일: cosfit/src/app/api/v1/notifications/register/route.ts (신규)
DB: DeviceToken 테이블 (신규 migration)
```

### 7.2 알림 설정

```
GET /api/v1/notifications/preferences

Response (200):
{
  "analysisComplete": true,
  "ingredientAlert": true,
  "promotion": false,
  "routineReminder": true
}

PUT /api/v1/notifications/preferences

Request:
{
  "analysisComplete": true,
  "ingredientAlert": true,
  "promotion": false,
  "routineReminder": true
}

파일: cosfit/src/app/api/v1/notifications/preferences/route.ts (신규)
DB: NotificationPreference 테이블 (신규 migration)
```

### 7.3 네이티브 소셜 로그인 토큰 교환

```
POST /api/v1/auth/social/native

Request:
{
  "provider": "google" | "apple" | "kakao",
  "idToken": "provider-id-token",
  "profile": {
    "email": "user@example.com",
    "name": "홍길동",
    "profileImage": "https://..."
  }
}

Response (200):
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "sessionToken": "next-auth-session-token",
  "user": {
    "id": "uuid",
    "email": "...",
    "name": "...",
    "role": "USER"
  }
}

파일: cosfit/src/app/api/v1/auth/social/native/route.ts (신규)
로직: provider idToken 검증 → User upsert → JWT 발급 → NextAuth 세션 생성
```

### 7.4 오프라인 동기화

```
POST /api/v1/sync/offline

Request:
{
  "lastSyncAt": "2026-03-08T00:00:00Z",
  "clientData": {
    "favorites": ["product-id-1", "product-id-2"],
    "searchHistory": ["바코드값1", "바코드값2"]
  }
}

Response (200):
{
  "syncedAt": "2026-03-09T12:00:00Z",
  "updates": {
    "profile": { ... },
    "analysisHistory": [ ... ],
    "favorites": [ ... ]
  }
}

파일: cosfit/src/app/api/v1/sync/offline/route.ts (신규)
정책: Server Wins (서버 데이터 우선)
```

### 7.5 DB 스키마 추가 (신규 migration)

```prisma
// 신규 모델 (기존 모델은 변경하지 않음)

model DeviceToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  platform  String   // "android" | "ios"
  appVersion String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])

  @@map("device_tokens")
}

model NotificationPreference {
  id               String  @id @default(uuid())
  userId           String  @unique
  analysisComplete Boolean @default(true)
  ingredientAlert  Boolean @default(true)
  promotion        Boolean @default(false)
  routineReminder  Boolean @default(true)
  user             User    @relation(fields: [userId], references: [id])

  @@map("notification_preferences")
}
```

---

## 8. CI/CD 설계 (앱 전용)

### 8.1 앱 CI 파이프라인

```yaml
# cosfit_app/.github/workflows/flutter-ci.yml (설계)
#
# Trigger: push to main, PR
# Steps:
#   1. Flutter SDK 설치
#   2. dart analyze (정적 분석)
#   3. flutter test (단위/위젯 테스트)
#   4. flutter build apk --debug (Android 빌드 검증)
#   5. flutter build ios --no-codesign (iOS 빌드 검증)
```

### 8.2 앱 CD 파이프라인

```yaml
# cosfit_app/.github/workflows/flutter-deploy.yml (설계)
#
# Trigger: tag push (v*)
# Steps:
#   1. Flutter SDK 설치
#   2. 버전 추출 (tag → pubspec version)
#   3. Android: flutter build appbundle → Fastlane → Google Play (Internal)
#   4. iOS: flutter build ipa → Fastlane → TestFlight
#   5. GitHub Release 생성
```

### 8.3 Sync Guard 파이프라인

```yaml
# shared/sync-guard/.github/workflows/sync-check.yml (설계)
#
# Trigger: cosfit 웹 저장소 deploy 완료 시 (repository_dispatch)
# Steps:
#   1. 웹 API 라우트 스캔 → OpenAPI 스펙 생성
#   2. shared/api-contract.yaml 과 diff
#   3. Breaking Change 여부 판단
#   4. 결과 → GitHub Issue (cosfit-app 저장소)
```

---

## 9. 테스트 설계

### 9.1 테스트 범위

| 테스트 유형 | 대상 | 도구 | 커버리지 목표 |
|-------------|------|------|--------------|
| 단위 테스트 | AuthManager, ApiClient, CacheManager | flutter_test | 80%+ |
| 위젯 테스트 | LoginScreen, ScannerScreen, SettingsScreen | flutter_test | 70%+ |
| 통합 테스트 | 로그인→WebView→스캔→결과 E2E | integration_test | 핵심 3 플로우 |
| JS Bridge 테스트 | postMessage 송수신 | flutter_test (mock) | 100% (전 메시지) |
| 호환성 테스트 | Android 8-14, iOS 15-18 | Firebase Test Lab | 주요 10 기기 |

### 9.2 핵심 테스트 시나리오

```
TC-01: 소셜 로그인 → 웹뷰 세션 동기화
  1. 앱 실행 → 로그인 화면
  2. Google 로그인 탭 → 네이티브 동의
  3. 토큰 교환 API 호출
  4. WebView에 세션 쿠키 주입
  5. WebView 홈 화면에 로그인 상태 확인

TC-02: 바코드 스캔 → 제품 상세
  1. 홈 화면 → 스캔 버튼 탭
  2. 카메라 권한 허용
  3. 바코드 인식 성공
  4. API로 제품 조회
  5. WebView 제품 상세 페이지 이동

TC-03: 오프라인 → 온라인 복구
  1. 앱에서 분석 이력 캐시됨
  2. 네트워크 끊김
  3. 캐시된 이력 조회 가능 확인
  4. 네트워크 복구
  5. 서버와 동기화 자동 실행
```

---

## 10. 구현 순서

> Phase별 구현 우선순위. 각 항목은 독립적으로 작업 가능한 단위.

### Phase 1 (Week 1-2): 기반 구축
```
1-1. Flutter 프로젝트 생성 (cosfit_app/)
1-2. 패키지 구조 생성 (core/, features/, shared/)
1-3. 환경 설정 (AppConfig, .env)
1-4. 디자인 토큰 변환 (Tailwind → Flutter ThemeData)
1-5. API 계약서 작성 (shared/api-contract.yaml)
1-6. Firebase 프로젝트 설정
1-7. CI 파이프라인 (flutter-ci.yml)
1-8. Sync Guard 기본 구조
```

### Phase 2 (Week 3-4): 핵심 인프라
```
2-1. WebView 컨테이너 (webview_screen.dart)
2-2. JS Bridge 구현 (js_bridge.dart + bridge_message.dart)
2-3. 하단 내비게이션 + WebView 탭 전환
2-4. Navigation Handler (URL 인터셉트)
2-5. API 클라이언트 (Dio + 인터셉터)
2-6. 인증 매니저 (token_storage + session_sync)
2-7. go_router 라우팅 시스템
2-8. 쿠키 동기화 (cookie_manager.dart)
```

### Phase 3 (Week 5-7): 네이티브 기능
```
3-1. 로그인 화면 + 소셜 로그인 UI
3-2. Google Sign-In 연동
3-3. Apple Sign-In 연동
3-4. Kakao Login 연동
3-5. 네이티브 토큰 교환 API (백엔드 신규)
3-6. 바코드 스캔 화면 (ML Kit)
3-7. 카메라 촬영 화면
3-8. FCM 설정 + 푸시 수신
3-9. 디바이스 토큰 등록 API (백엔드 신규)
3-10. 오프라인 캐시 (Hive)
3-11. 오프라인 동기화 API (백엔드 신규)
```

### Phase 4 (Week 7-8): 통합
```
4-1. 스플래시 화면 + 초기화 로직
4-2. 네이티브 설정 화면
4-3. 딥링크 처리 (app_links)
4-4. WebView ↔ Native 전환 통합
4-5. 앱 아이콘 + 스플래시 이미지
4-6. 다크 모드 지원
```

### Phase 5 (Week 8-9): QA
```
5-1. 단위 테스트 작성
5-2. 위젯 테스트 작성
5-3. 통합 테스트 (TC-01 ~ TC-03)
5-4. 보안 검수
5-5. 성능 최적화
5-6. 디바이스 호환성 테스트
```

### Phase 6 (Week 9-10): 배포
```
6-1. 스토어 리스팅 준비
6-2. 앱 심사 제출
6-3. 모니터링 설정 (Crashlytics)
6-4. 출시
```

---

*Created: 2026-03-09 | Feature: cosfit-mobile-app | Phase: Design*
*Reference: docs/01-plan/features/cosfit-mobile-app.plan.md*
