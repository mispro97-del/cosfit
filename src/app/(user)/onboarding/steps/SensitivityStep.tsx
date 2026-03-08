"use client";

import { StepHeader } from "@/components/ui";

const LEVELS = [
  { value: 1, label: "거의 없음", desc: "대부분의 제품을 잘 써요" },
  { value: 2, label: "약간", desc: "가끔 따끔거릴 때가 있어요" },
  { value: 3, label: "보통", desc: "새 제품 사용 시 주의해요" },
  { value: 4, label: "민감함", desc: "자극에 예민하게 반응해요" },
  { value: 5, label: "매우 민감", desc: "소수의 제품만 사용 가능해요" },
];

export function SensitivityStep({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <StepHeader
        emoji="🌿"
        title="피부 민감도는 어느 정도인가요?"
        subtitle="제품 성분 분석 시 민감도에 맞게 리스크를 평가해요"
      />
      <div className="flex flex-col gap-2.5">
        {LEVELS.map((level) => {
          const active = value === level.value;
          return (
            <button
              key={level.value}
              onClick={() => onChange(level.value)}
              className={`
                flex items-center gap-3.5 px-[18px] py-3.5 rounded-[14px]
                border-[1.5px] cursor-pointer transition-all duration-250 text-left
                ${
                  active
                    ? "border-[#10B981] bg-[#ECFDF5]"
                    : "border-[#E5E7EB] bg-white hover:border-[#A7F3D0]"
                }
              `}
            >
              <div className="flex gap-[3px]">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-[18px] rounded-sm transition-all duration-300"
                    style={{
                      background:
                        i < level.value
                          ? active
                            ? "#10B981"
                            : "#9CA3AF"
                          : "#E5E7EB",
                    }}
                  />
                ))}
              </div>
              <div className="flex-1">
                <div
                  className={`text-[15px] ${active ? "font-semibold text-[#059669]" : "font-medium text-[#1F2937]"}`}
                >
                  {level.label}
                </div>
                <div className="text-xs text-[#6B7280] mt-0.5">{level.desc}</div>
              </div>
              {active && <div className="text-[#10B981] text-lg ml-auto">✓</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
