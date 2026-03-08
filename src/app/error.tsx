"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="mobile-shell-bg">
    <div className="mobile-shell min-h-screen flex flex-col items-center justify-center bg-[#FFFFFF] px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">문제가 발생했어요</h2>
        <p className="text-sm text-gray-500 mb-6">
          일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-[#10B981] text-white rounded-xl text-sm font-medium hover:bg-[#059669] transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
    </div>
  );
}
