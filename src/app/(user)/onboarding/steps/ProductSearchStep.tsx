"use client";

import { useState, useRef } from "react";
import { StepHeader, ProgressBar } from "@/components/ui";

// 실제 구현 시 API 호출로 대체
const MOCK_PRODUCTS = [
  { id: "p1", name: "라운드랩 자작나무 수분 크림", brand: "라운드랩", category: "CREAM", image: "🧴" },
  { id: "p2", name: "이니스프리 그린티 씨드 세럼", brand: "이니스프리", category: "SERUM", image: "🌿" },
  { id: "p3", name: "아이소이 불가리안 로즈 크림", brand: "아이소이", category: "CREAM", image: "🌹" },
  { id: "p4", name: "코스알엑스 어드밴스드 스네일 에센스", brand: "COSRX", category: "SERUM", image: "🐌" },
  { id: "p5", name: "달바 워터풀 에센스 선크림", brand: "달바", category: "SUNSCREEN", image: "☀️" },
  { id: "p6", name: "에스트라 아토베리어 크림", brand: "에스트라", category: "CREAM", image: "🛡️" },
  { id: "p7", name: "넘버즈인 3번 글루타치온 세럼", brand: "넘버즈인", category: "SERUM", image: "✨" },
  { id: "p8", name: "토리든 다이브인 세럼", brand: "토리든", category: "SERUM", image: "💧" },
  { id: "p9", name: "아누아 어성초 토너", brand: "아누아", category: "TONER", image: "🍃" },
  { id: "p10", name: "구달 맑은 비타C 세럼", brand: "구달", category: "SERUM", image: "🍊" },
  { id: "p11", name: "클레어스 프레쉬리 쥬스드 비타민 드롭", brand: "클레어스", category: "SERUM", image: "🍋" },
  { id: "p12", name: "바이오더마 센시비오 클렌징워터", brand: "바이오더마", category: "CLEANSER", image: "🫧" },
];

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
}

export function ProductSearchStep({
  registered,
  onRegister,
  onRemove,
}: {
  registered: Product[];
  onRegister: (p: Product) => void;
  onRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered =
    query.length > 0
      ? MOCK_PRODUCTS.filter(
          (p) =>
            !registered.some((r) => r.id === p.id) &&
            (p.name.toLowerCase().includes(query.toLowerCase()) ||
              p.brand.toLowerCase().includes(query.toLowerCase()))
        )
      : [];

  const showDropdown = focused && query.length > 0;

  return (
    <div>
      <StepHeader
        emoji="💝"
        title="인생템을 등록해주세요"
        subtitle="나에게 잘 맞았던 제품을 알려주시면 AI가 성분 패턴을 분석해요"
      />

      <ProgressBar current={registered.length} max={3} label="인생템 등록" />

      {/* Info banner */}
      <div className="mb-5 p-3 px-4 rounded-xl bg-gradient-to-br from-[#ECFDF5] to-[#F0FAF6] border border-[#A7F3D0] flex items-center gap-2.5 animate-[fadeInUp_0.5s_ease_0.15s_both]">
        <span className="text-xl">💡</span>
        <span className="text-[13px] text-[#059669] leading-relaxed">
          <strong>최소 2개 이상</strong> 등록하면 분석 정확도가 크게 올라가요!
          {registered.length >= 2 && " ✨ 분석 준비 완료!"}
        </span>
      </div>

      {/* Search input */}
      <div className="relative mb-5">
        <div
          className={`
            flex items-center gap-2.5 px-4 py-3.5 rounded-[14px] bg-white
            border-[1.5px] transition-all duration-200
            ${focused ? "border-[#10B981] shadow-[0_0_0_3px_#ECFDF5]" : "border-[#E5E7EB]"}
          `}
        >
          <span className="text-lg opacity-50">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="제품명 또는 브랜드로 검색"
            className="flex-1 border-none outline-none text-[15px] text-[#1F2937] bg-transparent placeholder:text-[#9CA3AF]"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="bg-[#E5E7EB] border-none rounded-full w-[22px] h-[22px] cursor-pointer text-xs text-[#6B7280] flex items-center justify-center hover:bg-[#A7F3D0] transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {showDropdown && filtered.length > 0 && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-[14px] border border-[#E5E7EB] shadow-[0_8px_32px_rgba(45,36,32,0.12)] z-50 max-h-[260px] overflow-auto">
            {filtered.slice(0, 6).map((product, idx) => (
              <button
                key={product.id}
                onClick={() => {
                  onRegister(product);
                  setQuery("");
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 border-none bg-transparent cursor-pointer text-left hover:bg-[#F0FAF6] transition-colors"
                style={{
                  borderBottom: idx < Math.min(filtered.length, 6) - 1 ? "1px solid #E5E7EB" : "none",
                }}
              >
                <span className="text-[28px]">{product.image}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#1F2937]">{product.name}</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">{product.brand}</div>
                </div>
                <span className="text-lg text-[#10B981]">+</span>
              </button>
            ))}
          </div>
        )}

        {showDropdown && filtered.length === 0 && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-[14px] border border-[#E5E7EB] p-6 text-center shadow-[0_8px_32px_rgba(45,36,32,0.12)] z-50">
            <p className="text-sm text-[#6B7280] m-0">검색 결과가 없어요</p>
            <p className="text-xs text-[#9CA3AF] mt-1.5">제품명을 정확히 입력해주세요</p>
          </div>
        )}
      </div>

      {/* Registered products list */}
      {registered.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-sm font-semibold text-[#6B7280] m-0 mb-1">등록된 인생템</h3>
          {registered.map((product, idx) => (
            <div
              key={product.id}
              className="flex items-center gap-3 p-3.5 px-4 rounded-[14px] border-[1.5px] border-[#A7F3D0] bg-[#ECFDF5] animate-[fadeInUp_0.3s_ease_both]"
            >
              <span className="text-[28px]">{product.image}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#1F2937]">{product.name}</div>
                <div className="text-xs text-[#6B7280] mt-0.5">
                  {product.brand} · {product.category}
                </div>
              </div>
              <div className="bg-[#10B981] text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                #{idx + 1}
              </div>
              <button
                onClick={() => onRemove(product.id)}
                className="bg-transparent border-none text-base text-[#9CA3AF] cursor-pointer p-1 hover:text-[#6B7280] transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state with popular suggestions */}
      {registered.length === 0 && query.length === 0 && (
        <div className="text-center py-5 animate-[fadeInUp_0.5s_ease_0.2s_both]">
          <p className="text-[13px] text-[#9CA3AF] m-0 mb-4">인기 제품으로 빠르게 시작해보세요</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {MOCK_PRODUCTS.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={() => onRegister(p)}
                className="px-3.5 py-2 rounded-full border border-[#E5E7EB] bg-white text-xs text-[#6B7280] cursor-pointer hover:border-[#10B981] hover:text-[#10B981] transition-all"
              >
                {p.image} {p.brand}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
