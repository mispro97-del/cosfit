// ============================================================
// COSFIT - Next.js Production Configuration
// ============================================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── 빌드 최적화 ──
  reactStrictMode: true,
  poweredByHeader: false, // X-Powered-By 헤더 제거 (보안)

  // ── 이미지 최적화 ──
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cosfit.kr",
      },
      {
        protocol: "https",
        hostname: "openapi.foodsafetykorea.go.kr",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 768, 1024, 1280],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24, // 24시간
  },

  // ── 보안 헤더 ──
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://api.tosspayments.com https://openapi.foodsafetykorea.go.kr",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // ── 리다이렉트 ──
  async redirects() {
    return [
      {
        source: "/partner",
        destination: "/partner/dashboard",
        permanent: true,
      },
      {
        source: "/admin",
        destination: "/admin/data-collection",
        permanent: true,
      },
    ];
  },

  // ── 실험적 기능 ──
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },

  // ── 프로덕션 소스맵 (Sentry 등 에러 트래킹용) ──
  productionBrowserSourceMaps: false,

  // ── 빌드 출력 ──
  output: "standalone", // Docker 배포 최적화

  // ── ESLint ──
  eslint: {
    ignoreDuringBuilds: false,
  },

  // ── TypeScript ──
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
