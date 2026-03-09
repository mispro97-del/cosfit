// ============================================================
// COSFIT - User: 장바구니 (DB 연동)
// app/(user)/shop/cart/page.tsx
// ============================================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchCart,
  updateCartQuantity,
  removeFromCart,
  type CartItemData,
} from "../actions";

const CAT_EMOJI: Record<string, string> = {
  CREAM: "\uD83E\uDDF4", SERUM: "\uD83D\uDCA7", TONER: "\uD83C\uDF43",
  CLEANSER: "\uD83E\uDEE7", SUNSCREEN: "\u2600\uFE0F",
};

export default function CartPage() {
  const [items, setItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await fetchCart();
      if (result.success && result.data) {
        setItems(result.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleUpdateQty = async (item: CartItemData, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    setUpdating(item.id);

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
    );

    const result = await updateCartQuantity(item.id, newQty);
    if (!result.success) {
      // Revert
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: item.quantity } : i))
      );
    }
    setUpdating(null);
  };

  const handleRemove = async (itemId: string) => {
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== itemId));
    const result = await removeFromCart(itemId);
    if (!result.success) {
      setItems(prev);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const shipping = subtotal >= 50000 ? 0 : 3000;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-5">
        <span className="text-5xl mb-4">{"\uD83D\uDED2"}</span>
        <p className="text-base font-semibold text-[#2D2420] mb-2">장바구니가 비어있어요</p>
        <p className="text-sm text-[#8B7E76] mb-6">FIT Score가 높은 제품을 담아보세요!</p>
        <Link href="/compare" className="px-6 py-3 rounded-2xl bg-[#10B981] text-white font-semibold no-underline text-sm">
          제품 비교하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <h1 className="text-lg font-bold text-[#2D2420] m-0">{"\uD83D\uDED2"} 장바구니</h1>
      <p className="text-[13px] text-[#8B7E76] mt-1 mb-4">{items.length}개 상품</p>

      <div className="flex flex-col gap-2.5">
        {items.map((item) => {
          const fitColor = item.fitScore && item.fitScore >= 80 ? "#22C55E" : item.fitScore && item.fitScore >= 60 ? "#F59E0B" : "#EF4444";
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-3.5 flex gap-3">
              <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                {item.productImage ? (
                  <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  CAT_EMOJI[item.productCategory] ?? "\u2728"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#2D2420] truncate">{item.productName}</div>
                    <div className="text-xs text-[#8B7E76] mt-0.5">{item.productBrand}</div>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-base text-[#B5AAA2] bg-transparent border-none cursor-pointer p-1 -mr-1 -mt-1"
                  >
                    x
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
                    <div className="flex items-center border border-[#E5E7EB] rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleUpdateQty(item, -1)}
                        disabled={item.quantity <= 1 || updating === item.id}
                        className="w-7 h-7 bg-[#F3F4F6] border-none cursor-pointer text-sm text-[#5A4F48] disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="w-7 text-center text-[13px] font-semibold text-[#2D2420]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(item, 1)}
                        disabled={updating === item.id}
                        className="w-7 h-7 bg-[#F3F4F6] border-none cursor-pointer text-sm text-[#5A4F48] disabled:opacity-50"
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
      <div className="mt-4 p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
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
        <div className="flex justify-between text-base font-bold text-[#2D2420] border-t border-[#E5E7EB] pt-2.5 mt-1">
          <span>총 결제금액</span>
          <span className="text-[#10B981]">{total.toLocaleString()}원</span>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-5 pb-6 pt-3 bg-gradient-to-t from-white via-white to-transparent">
        <Link
          href="/shop/checkout"
          className="w-full flex items-center justify-center py-3.5 rounded-2xl no-underline text-[15px] font-bold text-white bg-gradient-to-br from-[#10B981] to-[#059669] shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
        >
          {total.toLocaleString()}원 결제하기
        </Link>
      </div>
    </div>
  );
}
