"use client";

import { StepHeader, ChipSelect } from "@/components/ui";

const SKIN_TYPES = [
  { value: "DRY", label: "건성", icon: "🏜️" },
  { value: "OILY", label: "지성", icon: "💧" },
  { value: "COMBINATION", label: "복합성", icon: "🌓" },
  { value: "SENSITIVE", label: "민감성", icon: "🌸" },
  { value: "NORMAL", label: "중성", icon: "✨" },
];

export function SkinTypeStep({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <StepHeader
        emoji="🪞"
        title="피부 타입을 알려주세요"
        subtitle="나에게 맞는 성분을 찾기 위한 첫걸음이에요"
      />
      <ChipSelect
        options={SKIN_TYPES}
        selected={value ?? ""}
        onToggle={onChange}
      />
    </div>
  );
}
