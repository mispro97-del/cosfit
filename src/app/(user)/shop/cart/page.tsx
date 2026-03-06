// ============================================================
// COSFIT - User: 장바구니
// app/(user)/shop/cart/page.tsx
// ============================================================

"use client";

import { useState } from "react";
import Link from "next/link";

const CAT_EMOJI: Record<string, string> = {
  CREAM: "🧴", SERUM: "💧", TONER: "🍃", CLEANSER: "🫧", SUNSCREEN: "☀️",
};

interface CartItem {
  id: string;
  productId: string;
  name: string;
  brand: string;
  category: string;
  quantity: number;
  unitPrice: number;
  fitScore: number | null;
}

const INITIAL_CART: CartItem[] = [
  { id: "ci1", productId: "p1", name: "에스트라 아토베리어 365 크림", brand: "에스트라", category: "CREAM", quantity: 1, unitPrice: 28000, fitScore: 82 },
  { id: "ci2", productId: "p2", name: "토리든 다이브인 세럼", brand: "토리든", category: "SERUM", quantity: 2, unitPrice: 18500, fitScore: 91 },
  { id: "ci3", productId: "p3", name: "구달 맑은 비타C 잡티 세럼", brand: "구달", category: "SERUM", quantity: 1, unitPrice: 22000, fitScore: 68 },
];

export default function CartPage() {
  const [items, setItems] = useState(INITIAL_CART);

  const updateQty = (id: string, delta: number) =>
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const shipping = subtotal >= 50000 ? 0 : 3000;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="max-w-[440px] mx-auto min-h-screen bg-[#FDFBF9] flex flex-col items-center justify-center px-5">
        <span className="text-5xl mb-4">🛒</span>
        <p className="text-base font-semibold text-[#2D2420] mb-2">장바구니가 비어있어요</p>
        <p className="text-sm text-[#8B7E76] mb-6">FIT Score가 높은 제품을 담아보세요!</p>
        <Link href="/history" className="px-6 py-3 rounded-2xl bg-[#C4816A] text-white font-semibold no-underline text-sm">
          분석 결과 보러가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[440px] mx-auto min-h-screen bg-[#FDFBF9] px-5 pt-5 pb-32">
      <h1 className="text-lg font-bold text-[#2D2420] m-0">🛒 장바구니</h1>
      <p className="text-[13px] text-[#8B7E76] mt-1 mb-4">{items.length}개 상품</p>

      <div className="flex flex-col gap-2.5">
        {items.map((item) => {
          const fitColor = item.fitScore && item.fitScore >= 80 ? "#22C55E" : item.fitScore && item.fitScore >= 60 ? "#F59E0B" : "#EF4444";
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-[#EDE6DF] p-3.5 flex gap-3">
              <div className="w-16 h-16 rounded-xl bg-[#F9F3ED] flex items-center justify-center text-3xl shrink-0">
                {CAT_EMOJI[item.category] ?? "✨"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#2D2420] truncate">{item.name}</div>
                    <div className="text-xs text-[#8B7E76] mt-0.5">{item.brand}</div>
                  </div>
                  <button
                    onClick={() => remove(item.id)}
                    className="text-base text-[#B5AAA2] bg-transparent border-none cursor-pointer p-1 -mr-1 -mt-1"
                  >
                    ×
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {item.fitScore && (
                      <span
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{ background: `${fitColor}12`, color: fitColor }}
                      >
                        FIT {item.fitScore}
                      </span>
                    )}
                    <div className="flex items-center border border-[#EDE6DF] rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-7 h-7 bg-[#F9F3ED] border-none cursor-pointer text-sm text-[#5A4F48]"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-[13px] font-semibold text-[#2D2420]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-7 h-7 bg-[#F9F3ED] border-none cursor-pointer text-sm text-[#5A4F48]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <span className="text-[15px] font-bold text-[#2D2420]">
                    {(item.unitPrice * item.quantity).toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 p-4 rounded-2xl bg-[#F9F3ED] border border-[#EDE6DF]">
        <div className="flex justify-between text-[13px] text-[#5A4F48] mb-2">
          <span>상품 금액</span>
          <span>{subtotal.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between text-[13px] text-[#5A4F48] mb-2">
          <span>
            배송비{" "}
            <span className="text-xs text-[#22C55E]">
              {subtotal >= 50000 ? "(무료배송)" : "(5만원 이상 무료)"}
            </span>
          </span>
          <span>{shipping === 0 ? "무료" : `${shipping.toLocaleString()}원`}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-[#2D2420] border-t border-[#EDE6DF] pt-2.5 mt-1">
          <span>총 결제금액</span>
          <span className="text-[#C4816A]">{total.toLocaleString()}원</span>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-5 pb-6 pt-3 bg-gradient-to-t from-[#FDFBF9] via-[#FDFBF9] to-transparent">
        <Link
          href="/shop/checkout"
          className="w-full flex items-center justify-center py-3.5 rounded-2xl no-underline text-[15px] font-bold text-white bg-gradient-to-br from-[#C4816A] to-[#A66B55] shadow-[0_4px_20px_rgba(196,129,106,0.3)]"
        >
          {total.toLocaleString()}원 결제하기
        </Link>
      </div>
    </div>
  );
}
