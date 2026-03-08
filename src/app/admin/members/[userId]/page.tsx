"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getMemberDetail, updateMemberStatus, type MemberDetail } from "../actions";

// ── Skin Type Labels ──

const SKIN_TYPE_LABELS: Record<string, string> = {
  DRY: "건성",
  OILY: "지성",
  COMBINATION: "복합성",
  SENSITIVE: "민감성",
  NORMAL: "중성",
};

const GENDER_LABELS: Record<string, string> = {
  MALE: "남성",
  FEMALE: "여성",
  OTHER: "기타",
  PREFER_NOT_TO_SAY: "미공개",
};

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "결제 대기", color: "text-gray-400" },
  PAID: { label: "결제 완료", color: "text-blue-400" },
  PREPARING: { label: "상품 준비", color: "text-amber-400" },
  SHIPPED: { label: "배송중", color: "text-cyan-400" },
  DELIVERED: { label: "배송 완료", color: "text-emerald-400" },
  CANCELLED: { label: "취소", color: "text-red-400" },
  RETURN_REQUESTED: { label: "반품 요청", color: "text-orange-400" },
  RETURNED: { label: "반품 완료", color: "text-red-400" },
};

const ONBOARDING_LABELS: Record<string, string> = {
  PENDING: "대기",
  SKIN_PROFILED: "피부분석 완료",
  PRODUCTS_ADDED: "제품등록 완료",
  STANDARD_READY: "기준생성 완료",
  COMPLETED: "온보딩 완료",
};

// ── Section Component ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#2D3348]">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-[#1E2234] last:border-0">
      <span className="text-xs text-[#8B92A5]">{label}</span>
      <span className="text-sm text-[#C8CDD8]">{value ?? "-"}</span>
    </div>
  );
}

// ── Main Page ──

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "skin" | "orders" | "activity">("basic");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const detail = await getMemberDetail(userId);
        if (!detail) {
          setError("해당 회원을 찾을 수 없습니다.");
        } else {
          setMember(detail);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  const handleStatusAction = async (action: "SUSPEND" | "ACTIVATE") => {
    if (!confirm(action === "SUSPEND" ? "해당 회원을 정지하시겠습니까?" : "해당 회원을 활성화하시겠습니까?")) {
      return;
    }
    setActionLoading(true);
    try {
      const result = await updateMemberStatus(userId, action);
      alert(result.message);
      if (result.success) {
        const detail = await getMemberDetail(userId);
        if (detail) setMember(detail);
      }
    } catch (e: any) {
      alert("오류: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-[#8B92A5] text-sm">회원 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-8">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400 text-sm mb-4">
          {error || "회원을 찾을 수 없습니다."}
        </div>
        <Link href="/admin/members" className="text-sm text-blue-400 hover:text-blue-300 no-underline">
          회원 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const tabs = [
    { key: "basic" as const, label: "기본 정보" },
    { key: "skin" as const, label: "피부 프로필" },
    { key: "orders" as const, label: "구매 정보" },
    { key: "activity" as const, label: "활동 정보" },
  ];

  return (
    <div className="p-8 max-w-[900px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/members" className="text-xs text-[#8B92A5] hover:text-white no-underline mb-2 block">
            &larr; 회원 목록으로
          </Link>
          <h1 className="text-xl font-bold text-white">{member.name ?? "미설정"}</h1>
          <p className="text-sm text-[#8B92A5] mt-1">{member.email}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusAction("SUSPEND")}
            disabled={actionLoading}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors disabled:opacity-50"
          >
            회원 정지
          </button>
          <button
            onClick={() => handleStatusAction("ACTIVATE")}
            disabled={actionLoading}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
          >
            활성화
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#141620] rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === t.key
                ? "bg-[#1A1E2E] text-white"
                : "text-[#8B92A5] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "basic" && (
        <Section title="기본 정보">
          <InfoRow label="이름" value={member.name ?? "미설정"} />
          <InfoRow label="이메일" value={member.email} />
          <InfoRow label="전화번호" value={member.phone ?? "미등록"} />
          <InfoRow label="가입일" value={member.createdAt} />
          <InfoRow label="마지막 접속" value={member.lastLoginAt ?? "기록 없음"} />
          <InfoRow
            label="이메일 인증"
            value={
              member.emailVerified ? (
                <span className="text-emerald-400">인증됨 ({member.emailVerified})</span>
              ) : (
                <span className="text-red-400">미인증</span>
              )
            }
          />
          <InfoRow label="온보딩 상태" value={ONBOARDING_LABELS[member.onboardingStatus] ?? member.onboardingStatus} />
        </Section>
      )}

      {activeTab === "skin" && (
        <Section title="피부 프로필">
          {member.skinProfile ? (
            <>
              <InfoRow label="피부 타입" value={SKIN_TYPE_LABELS[member.skinProfile.skinType] ?? member.skinProfile.skinType} />
              <InfoRow
                label="피부 고민"
                value={
                  member.skinProfile.skinConcerns.length > 0
                    ? member.skinProfile.skinConcerns.join(", ")
                    : "없음"
                }
              />
              <InfoRow
                label="알러지"
                value={
                  member.skinProfile.allergies.length > 0
                    ? member.skinProfile.allergies.join(", ")
                    : "없음"
                }
              />
              <InfoRow label="민감도" value={`${member.skinProfile.sensitivityLevel}/5`} />
              <InfoRow label="연령대" value={member.skinProfile.ageGroup ?? "미설정"} />
              <InfoRow label="성별" value={member.skinProfile.gender ? GENDER_LABELS[member.skinProfile.gender] ?? member.skinProfile.gender : "미설정"} />
            </>
          ) : (
            <div className="text-sm text-[#555B6E] py-4 text-center">피부 프로필이 아직 등록되지 않았습니다.</div>
          )}
        </Section>
      )}

      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Order Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5">
              <div className="text-xs text-[#8B92A5] mb-1">주문 건수</div>
              <div className="text-2xl font-bold text-white">{member.orderCount}</div>
            </div>
            <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5">
              <div className="text-xs text-[#8B92A5] mb-1">총 구매액</div>
              <div className="text-2xl font-bold text-white">{member.totalSpent.toLocaleString()}원</div>
            </div>
          </div>

          {/* Recent Orders */}
          <Section title="최근 주문 내역">
            {member.recentOrders.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2D3348]">
                    <th className="text-left py-2 text-xs font-medium text-[#555B6E]">주문번호</th>
                    <th className="text-left py-2 text-xs font-medium text-[#555B6E]">주문일</th>
                    <th className="text-right py-2 text-xs font-medium text-[#555B6E]">결제금액</th>
                    <th className="text-left py-2 text-xs font-medium text-[#555B6E]">상품수</th>
                    <th className="text-left py-2 text-xs font-medium text-[#555B6E]">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {member.recentOrders.map((o) => {
                    const st = ORDER_STATUS_LABELS[o.status] ?? { label: o.status, color: "text-gray-400" };
                    return (
                      <tr key={o.id} className="border-b border-[#1E2234]">
                        <td className="py-2 text-xs text-[#C8CDD8] font-mono">{o.orderNumber}</td>
                        <td className="py-2 text-xs text-[#8B92A5]">{o.orderedAt}</td>
                        <td className="py-2 text-xs text-[#C8CDD8] text-right">{o.finalAmount.toLocaleString()}원</td>
                        <td className="py-2 text-xs text-[#8B92A5]">{o.itemCount}개</td>
                        <td className="py-2">
                          <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-[#555B6E] py-4 text-center">주문 내역이 없습니다.</div>
            )}
          </Section>
        </div>
      )}

      {activeTab === "activity" && (
        <Section title="활동 정보">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#141620] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{member.compareCount}</div>
              <div className="text-xs text-[#8B92A5] mt-1">비교 분석</div>
            </div>
            <div className="bg-[#141620] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{member.userProductCount}</div>
              <div className="text-xs text-[#8B92A5] mt-1">등록 제품</div>
            </div>
            <div className="bg-[#141620] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{member.routineAnalysisCount}</div>
              <div className="text-xs text-[#8B92A5] mt-1">루틴 분석</div>
            </div>
            <div className="bg-[#141620] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{member.recommendationCount}</div>
              <div className="text-xs text-[#8B92A5] mt-1">추천 받은 제품</div>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
