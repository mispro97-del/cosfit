// ============================================================
// COSFIT - Partner Product Management Page
// app/(partner)/products/page.tsx
// ============================================================

"use client";

import { useState } from "react";

const MOCK = [
  { id: "pp1", name: "아토베리어 365 크림", category: "CREAM", status: "ACTIVE", ingredients: 32, avgFit: 82.1, compares: 847, desc: "민감한 피부를 위한 장벽 강화 크림", promoted: true },
  { id: "pp2", name: "아토베리어 로션", category: "EMULSION", status: "ACTIVE", ingredients: 28, avgFit: 78.4, compares: 623, desc: null, promoted: false },
  { id: "pp3", name: "더마 시카 크림", category: "CREAM", status: "ACTIVE", ingredients: 35, avgFit: 75.8, compares: 512, desc: null, promoted: false },
  { id: "pp4", name: "아토베리어 선크림 SPF50+", category: "SUNSCREEN", status: "ACTIVE", ingredients: 22, avgFit: 71.2, compares: 489, desc: "피부 장벽 보호 자외선 차단제", promoted: true },
  { id: "pp5", name: "더마 시카 토너", category: "TONER", status: "INACTIVE", ingredients: 18, avgFit: 68.9, compares: 376, desc: null, promoted: false },
];

const CAT_EMOJI: Record<string, string> = { CREAM: "🧴", SERUM: "💧", TONER: "🍃", CLEANSER: "🫧", SUNSCREEN: "☀️", EMULSION: "🌊" };

export default function ProductsPage() {
  const [editing, setEditing] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [products, setProducts] = useState(MOCK);

  const startEdit = (p: typeof MOCK[0]) => {
    setEditing(p.id);
    setEditDesc(p.desc ?? "");
  };

  const saveEdit = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, desc: editDesc || null } : p))
    );
    setEditing(null);
    console.log("[Partner] Updated product description:", { id, desc: editDesc });
  };

  const togglePromoted = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, promoted: !p.promoted } : p))
    );
    console.log("[Partner] Toggled promotion:", id);
  };

  return (
    <div className="p-8 max-w-[1100px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D21] m-0">제품 관리</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">자사 제품의 설명과 프로모션 상태를 관리하세요</p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-lg bg-[#F3F4F6] text-[#6B7280] font-medium">
          총 {products.length}개 제품
        </span>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E9ED] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E9ED]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[#9CA3AF]">제품</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">성분 수</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">평균 FIT</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">비교 수</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">프로모션</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">상태</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-[#9CA3AF]">작업</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const scoreColor = p.avgFit >= 80 ? "#22C55E" : p.avgFit >= 70 ? "#3B82F6" : "#F97316";
              const isEditing = editing === p.id;
              return (
                <tr key={p.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CAT_EMOJI[p.category] ?? "✨"}</span>
                      <div>
                        <div className="font-medium text-[#1A1D21]">{p.name}</div>
                        {isEditing ? (
                          <div className="mt-1.5 flex gap-2">
                            <input
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              placeholder="상세 설명 입력"
                              className="text-xs px-2 py-1 border border-[#E5E9ED] rounded-md flex-1 focus:outline-none focus:border-[#3B82F6]"
                            />
                            <button onClick={() => saveEdit(p.id)}
                              className="text-xs px-2 py-1 rounded-md bg-[#3B82F6] text-white border-none cursor-pointer">저장</button>
                            <button onClick={() => setEditing(null)}
                              className="text-xs px-2 py-1 rounded-md bg-[#F3F4F6] text-[#6B7280] border-none cursor-pointer">취소</button>
                          </div>
                        ) : (
                          <div className="text-xs text-[#9CA3AF] mt-0.5">
                            {p.desc ?? <span className="italic">설명 미입력</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-center text-[#4B5563]">{p.ingredients}</td>
                  <td className="text-center font-bold" style={{ color: scoreColor }}>{p.avgFit}</td>
                  <td className="text-center text-[#4B5563]">{p.compares.toLocaleString()}</td>
                  <td className="text-center">
                    <button onClick={() => togglePromoted(p.id)}
                      className={`text-xs px-2 py-0.5 rounded-md border-none cursor-pointer ${p.promoted ? "bg-blue-50 text-blue-600 font-semibold" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                      {p.promoted ? "✦ ON" : "OFF"}
                    </button>
                  </td>
                  <td className="text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${p.status === "ACTIVE" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      {p.status === "ACTIVE" ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="text-right px-5">
                    {!isEditing && (
                      <button onClick={() => startEdit(p)}
                        className="text-xs px-3 py-1.5 rounded-md border border-[#E5E9ED] bg-white text-[#4B5563] cursor-pointer hover:bg-[#F9FAFB] transition-colors">
                        ✏️ 수정
                      </button>
                    )}
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
