// ============================================================
// COSFIT - Admin: AI 리뷰 관리 (FR-R01)
// app/(admin)/review-management/page.tsx
// ============================================================
// AI가 요약한 제품별 장/단점 후기를 검토하고
// '승인'하여 사용자에게 노출하는 파이프라인 UI.
// ============================================================

"use client";

import { useState } from "react";

// ── Types ──

interface ReviewItem {
  id: string;
  productName: string;
  productBrand: string;
  userName: string;
  rating: number;
  content: string;
  pros: string[];
  cons: string[];
  status: "PENDING" | "AI_SUMMARIZED" | "APPROVED" | "REJECTED";
  aiSummary: string | null;
  aiSentiment: string | null;
  aiKeywords: string[];
  createdAt: string;
}

// ── Mock Data ──

const INITIAL: ReviewItem[] = [
  { id: "rev_01", productName: "아토베리어 365 크림", productBrand: "에스트라", userName: "진짜민감*", rating: 5, content: "겨울에 무조건 이거 써요. 진짜 자극 하나도 없고 속보습이 오래 가요. 건조한 피부에 최고입니다.", pros: ["무자극", "보습력"], cons: [], status: "AI_SUMMARIZED", aiSummary: "민감 피부 사용자가 높은 보습력과 저자극을 경험함. 겨울 시즌 핵심 아이템으로 평가.", aiSentiment: "POSITIVE", aiKeywords: ["무자극", "보습력", "겨울크림"], createdAt: "2025-06-14T08:30:00Z" },
  { id: "rev_02", productName: "아토베리어 365 크림", productBrand: "에스트라", userName: "뷰티러*", rating: 4, content: "향이 좀 아쉽지만 효과는 확실해요. 피부 장벽이 튼튼해진 느낌이 들어요.", pros: ["장벽강화", "효과확실"], cons: ["향"], status: "AI_SUMMARIZED", aiSummary: "장벽 강화 효과를 체감하나 향에 대한 아쉬움 있음. 총평 긍정적.", aiSentiment: "POSITIVE", aiKeywords: ["장벽강화", "향", "효과"], createdAt: "2025-06-13T15:20:00Z" },
  { id: "rev_03", productName: "더마 시카 크림", productBrand: "에스트라", userName: "스킨케*", rating: 2, content: "저한테는 안 맞았어요. 바르고 나서 붉어지고 따가웠어요. 다른 분들한테는 좋을 수도 있지만요.", pros: [], cons: ["자극", "붉어짐"], status: "AI_SUMMARIZED", aiSummary: "해당 사용자에게 접촉성 자극 반응 발생. 개인차에 대한 인지가 있는 부정적 리뷰.", aiSentiment: "NEGATIVE", aiKeywords: ["자극", "붉어짐", "부적합"], createdAt: "2025-06-12T11:45:00Z" },
  { id: "rev_04", productName: "다이브인 세럼", productBrand: "토리든", userName: "수분좋*", rating: 5, content: "진짜 수분감이 미쳤어요!! 가볍고 흡수 빠르고 최고. 이건 진짜 인생템이에요.", pros: ["수분감", "가벼움", "흡수력"], cons: [], status: "PENDING", aiSummary: null, aiSentiment: null, aiKeywords: [], createdAt: "2025-06-11T09:10:00Z" },
  { id: "rev_05", productName: "비타C 잡티 세럼", productBrand: "구달", userName: "잡티고*", rating: 3, content: "한 달 써봤는데 잡티는 좀 옅어진 것 같고 피부톤은 확실히 밝아졌어요. 근데 속도가 좀 느려요.", pros: ["미백", "톤업"], cons: ["효과느림"], status: "APPROVED", aiSummary: "1개월 사용 후 미백 효과 체감. 즉각 효과보다는 장기 사용 필요.", aiSentiment: "NEUTRAL", aiKeywords: ["미백", "톤업", "장기사용"], createdAt: "2025-06-10T14:30:00Z" },
  { id: "rev_06", productName: "스네일 뮤신 에센스", productBrand: "COSRX", userName: "달팽이*", rating: 4, content: "점성이 있지만 흡수는 잘 돼요. 다음날 아침 피부가 확실히 탱탱해요.", pros: ["탱탱함", "흡수력"], cons: ["점성"], status: "AI_SUMMARIZED", aiSummary: "달팽이 뮤신 특유의 텍스처에 대한 개인 선호 차이 있으나, 다음날 피부 개선 효과 경험.", aiSentiment: "POSITIVE", aiKeywords: ["탱탱함", "흡수", "뮤신"], createdAt: "2025-06-09T18:00:00Z" },
];

// ── Status Config ──

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:       { bg: "bg-slate-700/30", text: "text-slate-400", label: "대기" },
  AI_SUMMARIZED: { bg: "bg-amber-900/30", text: "text-amber-400", label: "AI 요약 완료" },
  APPROVED:      { bg: "bg-emerald-900/30", text: "text-emerald-400", label: "승인됨" },
  REJECTED:      { bg: "bg-red-900/30", text: "text-red-400", label: "반려됨" },
};

const SENTIMENT_CONFIG: Record<string, { emoji: string; color: string }> = {
  POSITIVE: { emoji: "😊", color: "text-emerald-400" },
  NEUTRAL:  { emoji: "😐", color: "text-amber-400" },
  NEGATIVE: { emoji: "😟", color: "text-red-400" },
};

// ── Main Component ──

export default function ReviewManagementPage() {
  const [reviews, setReviews] = useState(INITIAL);
  const [filter, setFilter] = useState<string>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiRunning, setAiRunning] = useState<string | null>(null);

  const filtered = filter === "ALL" ? reviews : reviews.filter((r) => r.status === filter);

  const counts = {
    ALL: reviews.length,
    PENDING: reviews.filter((r) => r.status === "PENDING").length,
    AI_SUMMARIZED: reviews.filter((r) => r.status === "AI_SUMMARIZED").length,
    APPROVED: reviews.filter((r) => r.status === "APPROVED").length,
    REJECTED: reviews.filter((r) => r.status === "REJECTED").length,
  };

  const handleApprove = (id: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "APPROVED" as const } : r))
    );
  };

  const handleReject = (id: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "REJECTED" as const } : r))
    );
  };

  const handleAiSummarize = (id: string) => {
    setAiRunning(id);
    setTimeout(() => {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "AI_SUMMARIZED" as const,
                aiSummary: `AI 요약: "${r.content.slice(0, 30)}..." 에 대한 분석 결과. 주요 키워드 추출 완료.`,
                aiSentiment: r.rating >= 4 ? "POSITIVE" : r.rating >= 3 ? "NEUTRAL" : "NEGATIVE",
                aiKeywords: r.pros.length > 0 ? r.pros : r.cons,
              }
            : r
        )
      );
      setAiRunning(null);
    }, 1500);
  };

  const handleBulkApprove = () => {
    setReviews((prev) =>
      prev.map((r) => (r.status === "AI_SUMMARIZED" ? { ...r, status: "APPROVED" as const } : r))
    );
  };

  return (
    <div className="p-8 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white m-0">💬 AI 리뷰 관리</h1>
          <p className="text-sm text-[#8B92A5] mt-1">AI 요약 검토 → 승인 → 사용자 노출 파이프라인</p>
        </div>
        {counts.AI_SUMMARIZED > 0 && (
          <button
            onClick={handleBulkApprove}
            className="px-4 py-2 rounded-lg text-sm font-medium border-none cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500 transition-all"
          >
            ✅ AI 요약 전체 승인 ({counts.AI_SUMMARIZED}건)
          </button>
        )}
      </div>

      {/* Pipeline indicator */}
      <div className="flex items-center gap-2 mb-6 bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-4">
        {[
          { label: "원본 수집", icon: "📝", count: counts.PENDING },
          { label: "AI 요약", icon: "🤖", count: counts.AI_SUMMARIZED },
          { label: "관리자 승인", icon: "✅", count: counts.APPROVED },
          { label: "사용자 노출", icon: "👁️", count: counts.APPROVED },
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex-1 text-center px-3 py-2.5 rounded-lg" style={{ background: i < 3 ? "#1E2234" : "#0F1117" }}>
              <div className="text-lg mb-0.5">{step.icon}</div>
              <div className="text-[11px] text-[#8B92A5]">{step.label}</div>
              <div className="text-sm font-bold text-white mt-0.5">{step.count}건</div>
            </div>
            {i < 3 && <span className="text-[#555B6E] text-lg">→</span>}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-4">
        {(["ALL", "PENDING", "AI_SUMMARIZED", "APPROVED", "REJECTED"] as const).map((f) => {
          const active = filter === f;
          const label = f === "ALL" ? "전체" : STATUS_CONFIG[f]?.label || f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer transition-all ${
                active
                  ? "bg-white/10 text-white"
                  : "bg-transparent text-[#555B6E] hover:text-[#8B92A5]"
              }`}
            >
              {label}
              <span className="ml-1 opacity-60">({counts[f]})</span>
            </button>
          );
        })}
      </div>

      {/* Review List */}
      <div className="space-y-3">
        {filtered.map((rev) => {
          const st = STATUS_CONFIG[rev.status] ?? STATUS_CONFIG.PENDING;
          const sent = rev.aiSentiment ? SENTIMENT_CONFIG[rev.aiSentiment] : null;
          const isExpanded = expanded === rev.id;
          const isRunning = aiRunning === rev.id;

          return (
            <div
              key={rev.id}
              className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden transition-all"
              style={{ boxShadow: isExpanded ? "0 4px 24px rgba(0,0,0,0.3)" : "none" }}
            >
              {/* Row header */}
              <div
                className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-[#1E2234] transition-colors"
                onClick={() => setExpanded(isExpanded ? null : rev.id)}
              >
                {/* Rating */}
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="text-xs" style={{ opacity: s <= rev.rating ? 1 : 0.2 }}>
                      ⭐
                    </span>
                  ))}
                </div>

                {/* Product/User */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-[#E5E7EB]">{rev.productName}</span>
                  <span className="text-xs text-[#555B6E] ml-2">{rev.productBrand}</span>
                  <span className="text-xs text-[#555B6E] ml-2">by {rev.userName}</span>
                </div>

                {/* Sentiment */}
                {sent && (
                  <span className={`text-sm ${sent.color}`}>{sent.emoji}</span>
                )}

                {/* Status */}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${st.bg} ${st.text}`}>
                  {st.label}
                </span>

                {/* Expand */}
                <span className="text-[#555B6E] text-xs">{isExpanded ? "▲" : "▼"}</span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-4 border-t border-[#2D3348]">
                  {/* Original review */}
                  <div className="mt-3 mb-3">
                    <div className="text-[11px] text-[#555B6E] mb-1 font-medium">원본 리뷰</div>
                    <div className="text-sm text-[#C8CDD8] leading-relaxed bg-[#0F1117] rounded-lg p-3">
                      &ldquo;{rev.content}&rdquo;
                    </div>
                  </div>

                  {/* Pros/Cons */}
                  <div className="flex gap-4 mb-3">
                    <div className="flex-1">
                      <div className="text-[11px] text-[#555B6E] mb-1">👍 장점</div>
                      <div className="flex flex-wrap gap-1">
                        {rev.pros.length > 0 ? (
                          rev.pros.map((p, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-emerald-900/30 text-emerald-400">
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#555B6E]">—</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] text-[#555B6E] mb-1">👎 단점</div>
                      <div className="flex flex-wrap gap-1">
                        {rev.cons.length > 0 ? (
                          rev.cons.map((c, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-red-900/30 text-red-400">
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#555B6E]">—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI Summary */}
                  {rev.aiSummary && (
                    <div className="mb-3">
                      <div className="text-[11px] text-[#555B6E] mb-1">🤖 AI 요약</div>
                      <div className="text-sm text-[#E5E7EB] bg-[#0F1117] rounded-lg p-3 border border-[#2D3348]">
                        {rev.aiSummary}
                      </div>
                      {rev.aiKeywords.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {rev.aiKeywords.map((kw, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-blue-900/30 text-blue-400">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[#2D3348]">
                    {rev.status === "PENDING" && (
                      <button
                        onClick={() => handleAiSummarize(rev.id)}
                        disabled={isRunning}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
                      >
                        {isRunning ? "⏳ AI 분석 중..." : "🤖 AI 요약 실행"}
                      </button>
                    )}
                    {rev.status === "AI_SUMMARIZED" && (
                      <>
                        <button
                          onClick={() => handleApprove(rev.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500 transition-all"
                        >
                          ✅ 승인
                        </button>
                        <button
                          onClick={() => handleReject(rev.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-800 bg-transparent text-red-400 cursor-pointer hover:bg-red-900/30 transition-all"
                        >
                          ❌ 반려
                        </button>
                      </>
                    )}
                    {rev.status === "APPROVED" && (
                      <span className="text-xs text-emerald-400/60">✅ 사용자에게 노출 중</span>
                    )}
                    {rev.status === "REJECTED" && (
                      <span className="text-xs text-red-400/60">❌ 반려됨</span>
                    )}
                    <div className="flex-1" />
                    <span className="text-[11px] text-[#555B6E]">
                      {new Date(rev.createdAt).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
