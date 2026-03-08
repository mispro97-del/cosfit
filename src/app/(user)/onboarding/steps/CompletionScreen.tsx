"use client";

import { PrimaryButton } from "@/components/ui";

interface Props {
  registeredCount: number;
  standardResult: { standardId: string; confidence: number } | null;
}

export function CompletionScreen({ registeredCount, standardResult }: Props) {
  const mockPatterns = ["보습 중심", "진정 케어"];
  const mockPreferred = ["글리세린", "히알루론산", "나이아신아마이드"];
  const confidencePct = standardResult
    ? Math.round(standardResult.confidence * 100)
    : 75;

  return (
    <div className="pb-10">
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0% { transform:scale(0.3); opacity:0; } 50% { transform:scale(1.1); } 70% { transform:scale(0.95); } 100% { transform:scale(1); opacity:1; } }
      `}</style>

      {/* Hero */}
      <div className="text-center mb-8">
        <div className="text-[64px] mb-3" style={{ animation: "bounce 0.6s ease" }}>
          🎊
        </div>
        <h2 className="text-2xl font-extrabold text-[#1F2937] m-0 mb-2">
          나만의 뷰티 기준 완성!
        </h2>
        <p className="text-sm text-[#6B7280] leading-relaxed">
          {registeredCount}개 인생템을 분석하여 개인 기준을 만들었어요
        </p>
      </div>

      {/* Standard Summary Card */}
      <div
        className="rounded-[20px] overflow-hidden border border-[#E5E7EB] bg-white mb-4 shadow-[0_4px_24px_rgba(45,36,32,0.06)]"
        style={{ animation: "fadeInUp 0.5s ease 0.2s both" }}
      >
        {/* Pattern section */}
        <div className="p-5 pb-4 bg-gradient-to-br from-[#ECFDF5] to-[#F0FAF6]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🧬</span>
            <h3 className="text-base font-bold text-[#1F2937] m-0">스킨케어 패턴</h3>
          </div>
          <div className="flex gap-2">
            {mockPatterns.map((p) => (
              <span
                key={p}
                className="px-3.5 py-1.5 rounded-full bg-white text-[13px] font-semibold text-[#10B981]"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Preferred ingredients */}
        <div className="p-5">
          <div className="mb-4">
            <div className="text-[13px] font-semibold text-[#6B7280] mb-2">✅ 핵심 선호 성분</div>
            <div className="flex flex-wrap gap-1.5">
              {mockPreferred.map((ing) => (
                <span
                  key={ing}
                  className="px-3 py-1 rounded-2xl bg-[#ECFDF5] text-[#10B981] text-[13px] font-medium"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {/* Confidence */}
          <div className="mb-4">
            <div className="text-[13px] font-semibold text-[#6B7280] mb-2">📊 분석 신뢰도</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-sm bg-[#E5E7EB] overflow-hidden">
                <div
                  className="h-full rounded-sm bg-gradient-to-r from-[#10B981] to-[#10B981]"
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
              <span className="text-sm font-bold text-[#10B981]">{confidencePct}%</span>
            </div>
          </div>

          <p className="text-[13px] text-[#6B7280] leading-relaxed m-0 pt-3 border-t border-[#E5E7EB]">
            💬 보습과 진정에 효과적인 성분을 선호해요.
            새 제품을 검색하면 이 기준으로 FIT Score를 받을 수 있어요!
          </p>
        </div>
      </div>

      {/* Tips card */}
      <div
        className="rounded-2xl p-4 bg-[#F0FAF6] border border-[#E5E7EB] mb-6"
        style={{ animation: "fadeInUp 0.5s ease 0.35s both" }}
      >
        <div className="text-sm font-semibold text-[#1F2937] mb-2">💡 이런 걸 할 수 있어요</div>
        <ul className="m-0 pl-5 text-[13px] text-[#6B7280] leading-loose">
          <li>새 제품 검색 → FIT Score로 나와의 궁합 확인</li>
          <li>성분 기반 맞춤 추천 받기</li>
          <li>인생템 추가 등록으로 정확도 높이기</li>
        </ul>
      </div>

      <PrimaryButton onClick={() => {/* navigate to home */}}>
        제품 탐색 시작하기 →
      </PrimaryButton>
    </div>
  );
}
