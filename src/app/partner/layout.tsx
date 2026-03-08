"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/partner/dashboard", label: "대시보드", icon: "📊" },
  { href: "/partner/products", label: "제품 관리", icon: "📦" },
  { href: "/partner/orders", label: "주문·배송", icon: "🚚" },
  { href: "/partner/inventory", label: "재고 관리", icon: "📋" },
  { href: "/partner/analytics", label: "매출 분석", icon: "📈" },
  { href: "/partner/reviews", label: "리뷰 관리", icon: "⭐" },
  { href: "/partner/promotions", label: "프로모션·쿠폰", icon: "🎫" },
  { href: "/partner/settings", label: "설정", icon: "⚙️" },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 로그인/회원가입 페이지에서는 레이아웃 없이 렌더링
  if (pathname === "/partner/login" || pathname === "/partner/signup") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center border-b border-[#E5E9ED] bg-white px-4 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0F4F8] text-[#4B5563] hover:bg-[#E5E9ED] transition-colors"
          aria-label="메뉴 열기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="ml-3 flex items-center gap-2">
          <span className="text-lg font-extrabold tracking-tight text-[#1A1D21]">COSFIT</span>
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">Partner</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[240px] border-r border-[#E5E9ED] bg-white flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center border-b border-[#E5E9ED] px-5 gap-2 justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-[#1A1D21]">COSFIT</span>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">Partner</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#F0F4F8] hover:text-[#4B5563] transition-colors lg:hidden"
            aria-label="메뉴 닫기"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#4B5563] no-underline hover:bg-[#F0F4F8] hover:text-[#1A1D21] transition-colors"
            >
              <span>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[#E5E9ED] p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold text-[#1A1D21]">입점사</div>
            <div className="text-xs text-[#9CA3AF]">Premium · 계약 활성</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/partner/login" })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen lg:ml-[240px] pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
