import Link from "next/link";

const NAV = [
  { href: "/admin/data-collection", label: "데이터 수집", icon: "🗄️" },
  { href: "/admin/normalization", label: "성분 정규화", icon: "🧬" },
  { href: "/admin/review-management", label: "AI 리뷰 관리", icon: "💬" },
  { href: "/admin/commerce", label: "커머스·정산", icon: "💰" },
  { href: "/admin/users", label: "사용자 관리", icon: "👥" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F1117]">
      <aside className="fixed inset-y-0 left-0 z-40 w-[220px] border-r border-[#1E2130] bg-[#141620] flex flex-col">
        <div className="flex h-14 items-center border-b border-[#1E2130] px-5 gap-2">
          <span className="text-lg font-extrabold tracking-tight text-white">COSFIT</span>
          <span className="rounded-md bg-red-900/40 px-2 py-0.5 text-[11px] font-semibold text-red-300">Admin</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8B92A5] no-underline hover:bg-[#1E2130] hover:text-white transition-colors">
              <span>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[#1E2130] p-4">
          <div className="text-sm font-semibold text-white">System Admin</div>
          <div className="text-xs text-[#555B6E]">cosfit-v1.0</div>
        </div>
      </aside>
      <main className="ml-[220px] min-h-screen">{children}</main>
    </div>
  );
}
