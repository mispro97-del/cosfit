// ============================================================
// COSFIT - User: 주문 내역 / 배송 조회
// app/(user)/shop/orders/page.tsx
// ============================================================

"use client";

import { useState } from "react";

interface Order {
  id: string;
  num: string;
  status: string;
  total: number;
  items: { name: string; qty: number; fit: number | null }[];
  date: string;
  payment: string;
  carrier: string | null;
  tracking: string | null;
}

const ORDERS: Order[] = [
  {
    id: "o1", num: "ORD-20250620-00412", status: "PREPARING", total: 65500,
    items: [{ name: "에스트라 아토베리어 365 크림", qty: 1, fit: 82 }, { name: "토리든 다이브인 세럼", qty: 2, fit: 91 }],
    date: "6월 20일", payment: "카카오페이", carrier: null, tracking: null,
  },
  {
    id: "o2", num: "ORD-20250615-00142", status: "SHIPPED", total: 62000,
    items: [{ name: "에스트라 아토베리어 365 크림", qty: 2, fit: 82 }, { name: "구달 비타C 세럼", qty: 1, fit: 68 }],
    date: "6월 15일", payment: "토스페이", carrier: "CJ대한통운", tracking: "645823197452",
  },
  {
    id: "o3", num: "ORD-20250610-00098", status: "DELIVERED", total: 28000,
    items: [{ name: "토리든 다이브인 세럼", qty: 1, fit: 91 }],
    date: "6월 10일", payment: "네이버페이", carrier: "CJ대한통운", tracking: "645823197128",
  },
];

const STATUS: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  PENDING_PAYMENT: { label: "결제 대기", bg: "#F3F4F6", color: "#8B7E76", icon: "⏳" },
  PAID: { label: "결제 완료", bg: "#EFF6FF", color: "#3B82F6", icon: "💳" },
  PREPARING: { label: "상품 준비중", bg: "#FFFBEB", color: "#D97706", icon: "📦" },
  SHIPPED: { label: "배송중", bg: "#EFF6FF", color: "#3B82F6", icon: "🚚" },
  DELIVERED: { label: "배송 완료", bg: "#F0FDF4", color: "#22C55E", icon: "✅" },
};

const TRACK_STEPS = ["결제 완료", "상품 준비", "배송 출발", "배송 완료"];
const STEP_MAP: Record<string, number> = { PAID: 0, PREPARING: 1, SHIPPED: 2, DELIVERED: 3 };

export default function OrdersPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="max-w-[440px] mx-auto min-h-screen bg-[#FDFBF9] px-5 pt-5 pb-10">
      <h1 className="text-lg font-bold text-[#2D2420] m-0">📦 주문 내역</h1>
      <p className="text-[13px] text-[#8B7E76] mt-1 mb-4">총 {ORDERS.length}건</p>

      <div className="flex flex-col gap-2.5">
        {ORDERS.map((ord) => {
          const st = STATUS[ord.status] ?? STATUS.PREPARING;
          const isOpen = selected === ord.id;
          const step = STEP_MAP[ord.status] ?? 0;

          return (
            <div
              key={ord.id}
              className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden transition-shadow"
              style={{ boxShadow: isOpen ? "0 4px 24px rgba(45,36,32,0.08)" : "none" }}
            >
              {/* Header row */}
              <div
                className="flex items-center gap-2.5 p-3.5 cursor-pointer"
                onClick={() => setSelected(isOpen ? null : ord.id)}
              >
                <span className="text-xl">{st.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#2D2420] truncate">
                    {ord.items[0].name}
                    {ord.items.length > 1 && ` 외 ${ord.items.length - 1}건`}
                  </div>
                  <div className="text-xs text-[#8B7E76] mt-0.5">
                    {ord.date} · {ord.total.toLocaleString()}원
                  </div>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                  style={{ background: st.bg, color: st.color }}
                >
                  {st.label}
                </span>
                <span className="text-xs text-[#B5AAA2]">{isOpen ? "▲" : "▼"}</span>
              </div>

              {/* Expanded */}
              {isOpen && (
                <div className="px-3.5 pb-3.5 border-t border-[#EDE6DF]">
                  {/* Tracking progress */}
                  <div className="flex items-center py-3 gap-0">
                    {TRACK_STEPS.map((s, i) => (
                      <div key={i} className="flex items-center" style={{ flex: i < TRACK_STEPS.length - 1 ? 1 : 0 }}>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{
                            background: i <= step ? "#C4816A" : "#EDE6DF",
                            color: i <= step ? "#fff" : "#B5AAA2",
                          }}
                        >
                          {i <= step ? "✓" : i + 1}
                        </div>
                        {i < TRACK_STEPS.length - 1 && (
                          <div
                            className="flex-1 h-0.5 mx-0.5 rounded"
                            style={{ background: i < step ? "#C4816A" : "#EDE6DF" }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mb-3">
                    {TRACK_STEPS.map((s, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-center flex-1"
                        style={{ color: i <= step ? "#C4816A" : "#B5AAA2" }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Tracking number */}
                  {ord.carrier && (
                    <div className="bg-[#EFF6FF] rounded-xl p-2.5 flex justify-between items-center mb-3">
                      <div>
                        <div className="text-[11px] font-semibold text-[#3B82F6]">
                          🚚 {ord.carrier}
                        </div>
                        <div className="text-[13px] font-bold text-[#2D2420] font-mono mt-0.5">
                          {ord.tracking}
                        </div>
                      </div>
                      <button className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-[#3B82F6]/30 bg-white text-[#3B82F6] cursor-pointer">
                        배송 조회
                      </button>
                    </div>
                  )}

                  {/* Items */}
                  {ord.items.map((item, i) => {
                    const fitColor = item.fit && item.fit >= 80 ? "#22C55E" : item.fit && item.fit >= 60 ? "#F59E0B" : "#EF4444";
                    return (
                      <div
                        key={i}
                        className="flex justify-between items-center py-1.5 text-[13px] text-[#5A4F48]"
                      >
                        <span>
                          {item.name} × {item.qty}
                        </span>
                        {item.fit && (
                          <span
                            className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: `${fitColor}12`, color: fitColor }}
                          >
                            FIT {item.fit}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex justify-between pt-2 mt-2 border-t border-dashed border-[#EDE6DF] text-xs text-[#8B7E76]">
                    <span>{ord.payment}</span>
                    <span className="font-semibold text-[#2D2420]">
                      {ord.total.toLocaleString()}원
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
