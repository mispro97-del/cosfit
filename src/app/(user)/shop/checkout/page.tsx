// ============================================================
// COSFIT - User: 결제/체크아웃 (DB 연동)
// app/(user)/shop/checkout/page.tsx
// ============================================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchCart, checkout, type CartItemData, type CheckoutInput } from "../actions";

// ── Types ──

interface ShippingForm {
  name: string;
  phone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  memo: string;
}

type PaymentMethod = "CARD" | "KAKAO_PAY" | "NAVER_PAY" | "TOSS_PAY";

const CAT_EMOJI: Record<string, string> = {
  CREAM: "\uD83E\uDDF4", SERUM: "\uD83D\uDCA7", TONER: "\uD83C\uDF43",
  CLEANSER: "\uD83E\uDEE7", SUNSCREEN: "\u2600\uFE0F",
};

const PAYMENTS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: "CARD", label: "신용/체크카드", icon: "\uD83D\uDCB3" },
  { id: "KAKAO_PAY", label: "카카오페이", icon: "\uD83D\uDFE1" },
  { id: "NAVER_PAY", label: "네이버페이", icon: "\uD83D\uDFE2" },
  { id: "TOSS_PAY", label: "토스페이", icon: "\uD83D\uDD35" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"form" | "processing" | "done">("form");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [shipping, setShipping] = useState<ShippingForm>({
    name: "", phone: "", zipCode: "", address: "", addressDetail: "", memo: "",
  });
  const [payMethod, setPayMethod] = useState<PaymentMethod>("KAKAO_PAY");

  useEffect(() => {
    async function load() {
      const result = await fetchCart();
      if (result.success && result.data) {
        if (result.data.length === 0) {
          router.push("/shop/cart");
          return;
        }
        setCartItems(result.data);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const subtotal = cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const shippingFee = subtotal >= 50000 ? 0 : 3000;
  const total = subtotal + shippingFee;

  const canSubmit = shipping.name && shipping.phone && shipping.address;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStep("processing");
    setError(null);

    const input: CheckoutInput = {
      shippingName: shipping.name,
      shippingPhone: shipping.phone,
      shippingZip: shipping.zipCode,
      shippingAddress: shipping.address,
      shippingDetail: shipping.addressDetail || undefined,
      shippingMemo: shipping.memo || undefined,
      paymentMethod: payMethod,
    };

    const result = await checkout(input);
    if (result.success && result.data) {
      setOrderNumber(result.data.orderNumber);
      setStep("done");
    } else {
      setError(result.error || "주문 처리에 실패했습니다.");
      setStep("form");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const fitBadge = (score: number | null) => {
    if (score === null) return null;
    const color = score >= 80 ? "#6B9E7D" : score >= 60 ? "#C4A83D" : "#EF4444";
    return (
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
        style={{ background: `${color}15`, color }}
      >
        FIT {score}
      </span>
    );
  };

  // ── Done state ──
  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-5">
        <div className="w-20 h-20 rounded-full bg-[#EDF5F0] flex items-center justify-center mb-4">
          <span className="text-3xl">{"\u2705"}</span>
        </div>
        <h2 className="text-lg font-bold text-[#2D2420] mb-1">결제가 완료되었어요!</h2>
        <p className="text-sm text-[#8B7E76] mb-2">
          주문번호: <span className="font-semibold text-[#5A4F48]">{orderNumber}</span>
        </p>
        <p className="text-[13px] text-[#B5AAA2] mb-6">
          {total.toLocaleString()}원 / {PAYMENTS.find((p) => p.id === payMethod)?.label}
        </p>
        <div className="flex gap-3">
          <Link
            href="/shop/orders"
            className="px-5 py-3 rounded-2xl bg-[#10B981] text-white font-semibold no-underline text-sm"
          >
            주문 내역 보기
          </Link>
          <Link
            href="/compare"
            className="px-5 py-3 rounded-2xl border border-[#E5E7EB] text-[#5A4F48] font-semibold no-underline text-sm"
          >
            계속 분석하기
          </Link>
        </div>
      </div>
    );
  }

  // ── Processing state ──
  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-5">
        <div className="animate-spin w-10 h-10 border-[3px] border-t-[#10B981] border-[#E5E7EB] rounded-full mb-4" />
        <p className="text-base font-semibold text-[#2D2420]">결제를 처리하고 있어요...</p>
        <p className="text-sm text-[#8B7E76] mt-1">잠시만 기다려주세요</p>
      </div>
    );
  }

  // ── Form state ──
  return (
    <div className="pb-32">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Link href="/shop/cart" className="text-[#8B7E76] text-xl px-2 py-1 no-underline hover:text-[#2D2420]">
          {"\u2190"}
        </Link>
        <span className="text-base font-bold text-[#2D2420]">결제하기</span>
      </div>

      {error && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 mb-4">
          <p className="text-sm text-[#991B1B]">{error}</p>
        </div>
      )}

      {/* Order summary */}
      <section className="mb-5">
        <h3 className="text-sm font-semibold text-[#2D2420] mb-3">주문 상품 ({cartItems.length}개)</h3>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          {cartItems.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < cartItems.length - 1 ? "1px solid #E5E7EB" : "none" }}
            >
              <span className="text-xl">{CAT_EMOJI[item.productCategory] ?? "\u2728"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#2D2420] truncate">{item.productName}</div>
                <div className="text-xs text-[#8B7E76]">{item.productBrand} / {item.quantity}개</div>
              </div>
              {fitBadge(item.fitScore)}
              <span className="text-sm font-bold text-[#2D2420] tabular-nums">
                {(item.unitPrice * item.quantity).toLocaleString()}원
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Shipping form */}
      <section className="mb-5">
        <h3 className="text-sm font-semibold text-[#2D2420] mb-3">배송 정보</h3>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
          {[
            { key: "name", label: "받는 분", placeholder: "홍길동", type: "text" },
            { key: "phone", label: "연락처", placeholder: "010-0000-0000", type: "tel" },
            { key: "zipCode", label: "우편번호", placeholder: "12345", type: "text" },
            { key: "address", label: "주소", placeholder: "서울특별시 강남구 ...", type: "text" },
            { key: "addressDetail", label: "상세주소", placeholder: "101동 1201호", type: "text" },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="text-xs font-medium text-[#8B7E76] mb-1 block">{label}</label>
              <input
                type={type}
                value={shipping[key as keyof ShippingForm]}
                onChange={(e) => setShipping((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#2D2420] bg-white outline-none focus:border-[#10B981] transition-colors"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-[#8B7E76] mb-1 block">배송 메모</label>
            <select
              value={shipping.memo}
              onChange={(e) => setShipping((p) => ({ ...p, memo: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#2D2420] bg-white outline-none"
            >
              <option value="">선택 안 함</option>
              <option value="문 앞에 놓아주세요">문 앞에 놓아주세요</option>
              <option value="부재 시 경비실에 맡겨주세요">부재 시 경비실에 맡겨주세요</option>
              <option value="배송 전 연락 주세요">배송 전 연락 주세요</option>
            </select>
          </div>
        </div>
      </section>

      {/* Payment method */}
      <section className="mb-5">
        <h3 className="text-sm font-semibold text-[#2D2420] mb-3">결제 수단</h3>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENTS.map((pm) => (
            <button
              key={pm.id}
              onClick={() => setPayMethod(pm.id)}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all"
              style={{
                borderColor: payMethod === pm.id ? "#10B981" : "#E5E7EB",
                background: payMethod === pm.id ? "#ECFDF5" : "#fff",
                color: payMethod === pm.id ? "#059669" : "#5A4F48",
              }}
            >
              <span className="text-lg">{pm.icon}</span>
              {pm.label}
            </button>
          ))}
        </div>
      </section>

      {/* Price breakdown */}
      <section className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
        <div className="flex justify-between text-sm text-[#5A4F48] mb-2">
          <span>상품 금액</span>
          <span className="font-semibold">{subtotal.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between text-sm text-[#5A4F48] mb-3">
          <span>배송비</span>
          <span className="font-semibold">
            {shippingFee === 0 ? (
              <span className="text-[#10B981]">무료</span>
            ) : (
              `${shippingFee.toLocaleString()}원`
            )}
          </span>
        </div>
        <div className="flex justify-between border-t border-[#E5E7EB] pt-3">
          <span className="text-base font-bold text-[#2D2420]">총 결제금액</span>
          <span className="text-lg font-extrabold text-[#10B981] tabular-nums">
            {total.toLocaleString()}원
          </span>
        </div>
      </section>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-5 pb-6 pt-3 bg-gradient-to-t from-white via-white to-transparent z-40">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-4 rounded-2xl border-none text-base font-semibold cursor-pointer transition-all"
          style={{
            background: canSubmit ? "linear-gradient(135deg, #10B981, #059669)" : "#E5E7EB",
            color: canSubmit ? "#fff" : "#B5AAA2",
            boxShadow: canSubmit ? "0 4px 20px rgba(16,185,129,0.35)" : "none",
          }}
        >
          {total.toLocaleString()}원 결제하기
        </button>
        <p className="text-center text-xs text-[#B5AAA2] mt-2">
          주문 내용을 확인하였으며, 결제에 동의합니다
        </p>
      </div>
    </div>
  );
}
