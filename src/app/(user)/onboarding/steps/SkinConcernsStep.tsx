"use client";

import { StepHeader, ChipSelect } from "@/components/ui";

const SKIN_CONCERNS = [
  { value: "acne", label: "여드름", icon: "🔴" },
  { value: "wrinkles", label: "주름·탄력", icon: "〰️" },
  { value: "pigmentation", label: "색소·잡티", icon: "🟤" },
  { value: "dryness", label: "건조·당김", icon: "🌵" },
  { value: "pores", label: "모공", icon: "⭕" },
  { value: "redness", label: "홍조·붉은기", icon: "🔺" },
  { value: "dullness", label: "칙칙함", icon: "🌫️" },
  { value: "oiliness", label: "유분 과다", icon: "💦" },
  { value: "dark_circles", label: "다크서클", icon: "👁️" },
  { value: "elasticity", label: "처짐", icon: "📐" },
];

export function SkinConcernsStep({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (concern: string) => {
    const next = value.includes(concern)
      ? value.filter((v) => v !== concern)
      : [...value, concern];
    onChange(next);
  };

  return (
    <div>
      <StepHeader
        emoji="🔍"
        title="피부 고민을 선택해주세요"
        subtitle="여러 개 선택할 수 있어요 (최소 1개)"
      />
      <ChipSelect
        options={SKIN_CONCERNS}
        selected={value}
        onToggle={toggle}
        multi
      />
      {value.length > 0 && (
        <p className="text-center text-[13px] text-[#10B981] mt-4 animate-[fadeInUp_0.3s_ease_both]">
          {value.length}개 선택됨
        </p>
      )}
    </div>
  );
}
