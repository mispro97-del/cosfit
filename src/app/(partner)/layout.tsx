import Link from "next/link";

const NAV = [
  { href: "/partner/dashboard", label: "대시보드", icon: "📊" },
  { href: "/partner/products", label: "제품 관리", icon: "📦" },
  { href: "/partner/orders", label: "주문·배송", icon: "🚚" },
  { href: "/partner/settings", label: "설정", icon: "⚙️" },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <aside className="fixed inset-y-0 left-0 z-40 w-[240px] border-r border-[#E5E9ED] bg-white flex flex-col">
        <div className="flex h-14 items-center border-b border-[#E5E9ED] px-5 gap-2">
          <span className="text-lg font-extrabold tracking-tight text-[#1A1D21]">COSFIT</span>
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">Partner</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#4B5563] no-underline hover:bg-[#F0F4F8] hover:text-[#1A1D21] transition-colors">
              <span>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[#E5E9ED] p-4">
          <div className="text-sm font-semibold text-[#1A1D21]">에스트라</div>
          <div className="text-xs text-[#9CA3AF]">Premium · 계약 활성</div>
        </div>
      </aside>
      <main className="ml-[240px] min-h-screen">{children}</main>
    </div>
  );
}
