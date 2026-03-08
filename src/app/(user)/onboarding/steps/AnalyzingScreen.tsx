"use client";

import { useState, useEffect } from "react";

const PHASES = [
  { emoji: "🧬", text: "등록된 인생템의 성분을 추출하고 있어요..." },
  { emoji: "🔬", text: "공통 성분 패턴을 분석하고 있어요..." },
  { emoji: "🧪", text: "선호 성분과 주의 성분을 분류하고 있어요..." },
  { emoji: "✨", text: "나만의 뷰티 기준을 생성하고 있어요..." },
  { emoji: "🎉", text: "분석 완료! 개인 기준이 생성되었어요!" },
];

export function AnalyzingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1.2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 20) setPhase(0);
    else if (progress < 45) setPhase(1);
    else if (progress < 70) setPhase(2);
    else if (progress < 95) setPhase(3);
    else setPhase(4);
  }, [progress]);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(onComplete, 1200);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Animated rings */}
      <div className="relative w-[140px] h-[140px] mb-10">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              inset: i * 12,
              border: `2px solid ${i === 0 ? "#10B981" : i === 1 ? "#A7F3D0" : "#E5E7EB"}`,
              borderTopColor: "transparent",
              animation: `spin ${1.5 + i * 0.5}s linear infinite${i === 1 ? " reverse" : ""}`,
            }}
          />
        ))}
        <div
          className="absolute inset-0 flex items-center justify-center text-[44px]"
          style={{ animation: "pulse 2s ease-in-out infinite" }}
        >
          {PHASES[phase].emoji}
        </div>
      </div>

      {/* Phase text */}
      <p
        key={phase}
        className="text-base font-medium text-[#1F2937] mb-6 leading-relaxed"
        style={{ animation: "fadeInUp 0.4s ease both" }}
      >
        {PHASES[phase].text}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-[280px]">
        <div className="h-1.5 rounded-sm bg-[#E5E7EB] overflow-hidden mb-2">
          <div
            className="h-full rounded-sm transition-all duration-300"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: progress >= 100
                ? "#10B981"
                : "linear-gradient(90deg, #10B981, #059669)",
            }}
          />
        </div>
        <p className="text-[13px] text-[#6B7280] m-0">
          {Math.min(Math.round(progress), 100)}%
        </p>
      </div>
    </div>
  );
}
