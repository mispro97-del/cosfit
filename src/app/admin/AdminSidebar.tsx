"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/admin/products", label: "제품 관리", icon: "📦" },
  { href: "/admin/data-collection", label: "식약처 연동", icon: "🏥" },
  { href: "/admin/normalization", label: "성분 정규화", icon: "🧬" },
  { href: "/admin/review-management", label: "AI 리뷰 관리", icon: "💬" },
  { href: "/admin/reviews", label: "리뷰 수집", icon: "📝" },
  { href: "/admin/commerce", label: "커머스·정산", icon: "💰" },
  { href: "/admin/members", label: "회원 관리", icon: "👥" },
  { href: "/admin/statistics", label: "통계/보고서", icon: "📈" },
  { href: "/admin/ingredients", label: "성분 관리", icon: "🧪" },
  { href: "/admin/ingredients/knowledge", label: "성분 지식 DB", icon: "🧠" },
  { href: "/admin/data-quality", label: "데이터 품질", icon: "📊" },
  { href: "/admin/etl", label: "ETL 파이프라인", icon: "⚙️" },
  { href: "/admin/admin-users", label: "관리자 계정", icon: "👤" },
];

export default function AdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 로그인 페이지 또는 비밀번호 변경 페이지에서는 레이아웃(사이드바) 없이 렌더링
  if (pathname === "/admin/login" || pathname === "/admin/change-password") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0F1117]">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center border-b border-[#1E2130] bg-[#141620] px-4 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E2130] text-white hover:bg-[#2A2E42] transition-colors"
          aria-label="메뉴 열기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="ml-3 flex items-center gap-2">
          <span className="text-lg font-extrabold tracking-tight text-white">COSFIT</span>
          <span className="rounded-md bg-red-900/40 px-2 py-0.5 text-[11px] font-semibold text-red-300">Admin</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 w-[220px] border-r border-[#1E2130] bg-[#141620] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center border-b border-[#1E2130] px-5 gap-2 justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-white">COSFIT</span>
            <span className="rounded-md bg-red-900/40 px-2 py-0.5 text-[11px] font-semibold text-red-300">Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8B92A5] hover:bg-[#1E2130] hover:text-white transition-colors lg:hidden"
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8B92A5] no-underline hover:bg-[#1E2130] hover:text-white transition-colors"
            >
              <span>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[#1E2130] p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold text-white">System Admin</div>
            <div className="text-xs text-[#555B6E]">cosfit-v1.0</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 bg-red-900/20 hover:bg-red-900/40 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main min-h-screen lg:ml-[220px] pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
