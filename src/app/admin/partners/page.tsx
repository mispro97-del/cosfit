"use client";

const MOCK_PARTNERS = [
  { id: "1", company: "에스트라", rep: "김대표", email: "aestura@test.com", plan: "Premium", status: "ACTIVE", products: 24, joined: "2026-01-10" },
  { id: "2", company: "라운드랩", rep: "박대표", email: "roundlab@test.com", plan: "Standard", status: "ACTIVE", products: 18, joined: "2026-02-01" },
  { id: "3", company: "토리든", rep: "이대표", email: "torriden@test.com", plan: "Premium", status: "ACTIVE", products: 15, joined: "2026-02-15" },
];

const STATUS_STYLE = {
  ACTIVE: { bg: "bg-emerald-900/30", text: "text-emerald-400", label: "활성" },
  PENDING: { bg: "bg-amber-900/30", text: "text-amber-400", label: "심사중" },
  SUSPENDED: { bg: "bg-red-900/30", text: "text-red-400", label: "정지" },
};

export default function PartnersPage() {
  return (
    <div className="p-8 max-w-[1100px]">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white m-0">🏢 입점사 관리</h1>
        <p className="text-sm text-[#8B92A5] mt-1">입점 파트너 조회 · 계약 관리</p>
      </div>

      <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D3348]">
              {["회사명", "대표", "이메일", "플랜", "등록 제품", "가입일", "상태"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-[#555B6E]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_PARTNERS.map((p) => {
              const st = STATUS_STYLE[p.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.PENDING;
              return (
                <tr key={p.id} className="border-b border-[#1E2234] hover:bg-[#1E2234]">
                  <td className="px-4 py-3 text-[#C8CDD8] font-medium">{p.company}</td>
                  <td className="px-4 py-3 text-[#8B92A5]">{p.rep}</td>
                  <td className="px-4 py-3 text-[#8B92A5] text-xs">{p.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${p.plan === "Premium" ? "bg-violet-900/30 text-violet-400" : "bg-blue-900/30 text-blue-400"}`}>{p.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-[#C8CDD8] font-mono">{p.products}</td>
                  <td className="px-4 py-3 text-[#8B92A5] text-xs">{p.joined}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${st.bg} ${st.text}`}>{st.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
