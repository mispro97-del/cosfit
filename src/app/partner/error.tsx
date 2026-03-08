"use client";

import { useEffect } from "react";

export default function PartnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PartnerError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">오류가 발생했습니다</h2>
        <p className="text-sm text-gray-500 mb-6">{error.message || "잠시 후 다시 시도해 주세요."}</p>
        <button
          onClick={reset}
          className="px-5 py-2 bg-[#10B981] text-white rounded-xl text-sm hover:bg-[#059669] transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
