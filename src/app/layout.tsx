// ============================================================
// COSFIT - Root Layout (Production-Optimized)
// ============================================================

import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// ── next/font: 자동 셀프호스팅, FOUT/FOIT 방지, CLS 최적화 ──
const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-noto",
  preload: true,
});

// ── Metadata ──
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://cosfit.kr"),
  title: {
    default: "COSFIT - 나에게 맞는 화장품을 찾아주는 AI",
    template: "%s | COSFIT",
  },
  description:
    "인생템 기반 AI 성분 분석으로 나만의 뷰티 기준을 만들어보세요. FIT Score로 내 피부에 맞는 화장품을 추천받으세요.",
  keywords: [
    "화장품 성분 분석",
    "AI 뷰티",
    "맞춤 화장품",
    "FIT Score",
    "코스핏",
    "피부 타입",
    "성분 매칭",
  ],
  authors: [{ name: "COSFIT", url: "https://cosfit.kr" }],
  creator: "COSFIT",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://cosfit.kr",
    siteName: "COSFIT",
    title: "COSFIT - 나에게 맞는 화장품을 찾아주는 AI",
    description:
      "인생템 기반 AI 성분 분석으로 나만의 뷰티 기준을 만들어보세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "COSFIT - 초개인화 뷰티 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "COSFIT - 나에게 맞는 화장품을 찾아주는 AI",
    description: "인생템 기반 AI 성분 분석으로 나만의 뷰티 기준을 만들어보세요.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

// ── Viewport ──
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#C4816A",
};

// ── Layout ──
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body className={notoSansKR.className}>{children}</body>
    </html>
  );
}
