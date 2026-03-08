"use client";

import { useState } from "react";

const MOCK_USERS = [
  { id: "1", name: "김지연", email: "jiyeon@test.com", role: "USER", status: "ACTIVE", joined: "2026-02-15", skinType: "건성" },
  { id: "2", name: "박민수", email: "minsu@test.com", role: "USER", status: "ACTIVE", joined: "2026-02-20", skinType: "지성" },
  { id: "3", name: "이서윤", email: "seoyun@test.com", role: "USER", status: "ACTIVE", joined: "2026-03-01", skinType: "복합성" },
  { id: "4", name: "최하은", email: "haeun@test.com", role: "USER", status: "SUSPENDED", joined: "2026-03-05", skinType: "민감성" },
  { id: "5", name: "정우진", email: "woojin@test.com", role: "USER", status: "ACTIVE", joined: "2026-03-07", skinType: "중성" },
];

const STATUS_STYLE = {
  ACTIVE: { bg: "bg-emerald-900/30", text: "text-emerald-400", label: "활성" },
  SUSPENDED: { bg: "bg-red-900/30", text: "text-red-400", label: "정지" },
  PENDING: { bg: "bg-amber-900/30", text: "text-amber-400", label: "대기" },
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_USERS.filter(
    (u) => u.name.includes(search) || u.email.includes(search)
  );

  return (
    <div className="p-8 max-w-[1100px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white m-0">👥 사용자 관리</h1>
          <p className="text-sm text-[#8B92A5] mt-1">전체 사용자 조회 · 상태 관리</p>
        </div>
        <input
          type="text"
          placeholder="이름 또는 이메일 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 bg-[#1A1E2E] border border-[#2D3348] rounded-lg text-sm text-white placeholder:text-[#555B6E] outline-none focus:border-blue-500 w-64"
        />
      </div>

      <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D3348]">
              {["이름", "이메일", "피부 타입", "가입일", "상태"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-[#555B6E]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const st = STATUS_STYLE[u.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.PENDING;
              return (
                <tr key={u.id} className="border-b border-[#1E2234] hover:bg-[#1E2234]">
                  <td className="px-4 py-3 text-[#C8CDD8] font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-[#8B92A5] text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-[#8B92A5]">{u.skinType}</td>
                  <td className="px-4 py-3 text-[#8B92A5] text-xs">{u.joined}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${st.bg} ${st.text}`}>{st.label}</span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#555B6E]">검색 결과가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
