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
            background: i === current ? "#C4816A" : i < current ? "#E8D4CA" : "#EDE6DF",
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
      className={`
        w-full py-4 rounded-[14px] border-none text-base font-semibold
        transition-all duration-300 active:scale-[0.97]
        ${
          disabled
            ? "bg-[#EDE6DF] text-[#B5AAA2] cursor-not-allowed shadow-none"
            : "bg-gradient-to-br from-[#C4816A] to-[#A66B55] text-white cursor-pointer shadow-[0_4px_16px_rgba(196,129,106,0.3)] hover:shadow-[0_6px_24px_rgba(196,129,106,0.4)]"
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
      className="bg-transparent border-none text-[#B5AAA2] text-sm cursor-pointer py-3 underline underline-offset-[3px] hover:text-[#8B7E76] transition-colors"
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
      <h2 className="text-[22px] font-bold text-[#2D2420] leading-snug m-0">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-[#8B7E76] mt-2 leading-relaxed">
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
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const active = isSelected(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            className={`
              px-[18px] py-2.5 rounded-3xl text-sm cursor-pointer
              transition-all duration-250 border-[1.5px]
              ${
                active
                  ? "border-[#C4816A] bg-[#F5EDE8] text-[#A66B55] font-semibold scale-[1.03]"
                  : "border-[#EDE6DF] bg-white text-[#8B7E76] font-normal scale-100 hover:border-[#E8D4CA]"
              }
            `}
          >
            {opt.icon && <span className="mr-1.5">{opt.icon}</span>}
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
        <span className="text-[13px] text-[#8B7E76]">{label}</span>
        <span className="text-[13px] text-[#C4816A] font-semibold">
          {current}/{max}
        </span>
      </div>
      <div className="h-1 rounded-sm bg-[#EDE6DF] overflow-hidden">
        <div
          className="h-full rounded-sm bg-gradient-to-r from-[#C4816A] to-[#A66B55] transition-[width] duration-600"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
