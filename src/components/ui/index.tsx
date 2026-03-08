// ============================================================
// COSFIT - Shared UI Components
// ============================================================

"use client";

// ── ProgressDots ──
export function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center py-4">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="h-2 rounded-full transition-all duration-400"
          style={{
            width: i === current ? 24 : 8,
            background: i === current ? "#10B981" : i < current ? "#A7F3D0" : "#E5E7EB",
          }}
        />
      ))}
    </div>
  );
}

// ── PrimaryButton ──
export function PrimaryButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ height: 56 }}
      className={`
        w-full rounded-[14px] border-none text-[15px] font-bold
        transition-all duration-200 active:scale-[0.97]
        ${
          disabled
            ? "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed shadow-none"
            : "bg-gradient-to-br from-[#10B981] to-[#059669] text-white cursor-pointer shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)]"
        }
      `}
    >
      {children}
    </button>
  );
}

// ── SkipButton ──
export function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-transparent border-none text-[#9CA3AF] text-sm cursor-pointer py-3 underline underline-offset-[3px] hover:text-[#6B7280] transition-colors"
    >
      다음에 할게요
    </button>
  );
}

// ── StepHeader ──
export function StepHeader({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-8 animate-[fadeInUp_0.5s_ease_0.1s_both]">
      <div className="text-5xl mb-3">{emoji}</div>
      <h2 className="text-[22px] font-bold text-[#1F2937] leading-snug m-0">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ── ChipSelect ──
interface ChipOption {
  value: string;
  label: string;
  icon?: string;
}

export function ChipSelect({
  options,
  selected,
  onToggle,
  multi = false,
}: {
  options: ChipOption[];
  selected: string | string[];
  onToggle: (value: string) => void;
  multi?: boolean;
}) {
  const isSelected = (value: string) =>
    multi ? (selected as string[]).includes(value) : selected === value;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((opt) => {
        const active = isSelected(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            style={{ minHeight: 52 }}
            className={`
              flex items-center justify-center gap-2
              rounded-2xl text-sm cursor-pointer
              transition-all duration-200 border-[1.5px] px-4
              ${
                active
                  ? "border-[#10B981] bg-[#ECFDF5] text-[#059669] font-semibold shadow-[0_2px_8px_rgba(16,185,129,0.2)]"
                  : "border-[#E5E7EB] bg-white text-[#4B5563] font-medium hover:border-[#A7F3D0] hover:bg-[#F5FBF8]"
              }
            `}
          >
            {opt.icon && <span className="text-[18px]">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── ProgressBar ──
export function ProgressBar({
  current,
  max,
  label,
}: {
  current: number;
  max: number;
  label: string;
}) {
  const pct = Math.min((current / max) * 100, 100);
  return (
    <div className="px-0 mb-4">
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px] text-[#6B7280]">{label}</span>
        <span className="text-[13px] text-[#10B981] font-semibold">
          {current}/{max}
        </span>
      </div>
      <div className="h-1 rounded-sm bg-[#E5E7EB] overflow-hidden">
        <div
          className="h-full rounded-sm bg-gradient-to-r from-[#10B981] to-[#059669] transition-[width] duration-600"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
