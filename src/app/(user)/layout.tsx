"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { href: "/home", label: "홈", icon: HomeIcon },
    { href: "/compare", label: "비교", icon: CompareIcon },
    { href: "/history", label: "기록", icon: HistoryIcon },
    { href: "/mypage", label: "내정보", icon: ProfileIcon },
  ];

  return (
    <nav
      className="fixed bottom-0 z-50 bg-white border-t border-[#E5E7EB]"
      style={{
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "440px",
      }}
    >
      <div
        className="flex items-stretch"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/home"
              ? pathname === "/home" || pathname === "/"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors"
            >
              <Icon
                className="h-6 w-6 transition-colors"
                style={{ color: isActive ? "#10B981" : "#9CA3AF" }}
              />
              <span
                className="text-[10px] font-medium leading-tight"
                style={{ color: isActive ? "#10B981" : "#9CA3AF" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ── SVG Icons ── */

function HomeIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function CompareIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  );
}

function HistoryIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  );
}

function ProfileIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mobile-shell-bg">
      <div className="mobile-shell">
        {/* Header */}
        <header className="glass-header sticky top-0 z-50" data-sticky="true">
          <nav className="flex h-14 items-center justify-between px-4">
            {/* Left: Logo */}
            <Link href="/home" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
                <span className="text-white text-sm font-bold">C</span>
              </div>
              <span className="text-lg font-extrabold tracking-tight text-[#1F2937]">
                COSFIT
              </span>
            </Link>

            {/* Right: Guest + Status badge */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-[#6B7280]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                <span>Guest</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0]">
                <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-xs font-semibold text-[#059669]">
                  Active
                </span>
              </div>
            </div>
          </nav>
        </header>

        {/* Main content — padded for bottom nav */}
        <main className="px-4 pt-4 pb-safe">{children}</main>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}
