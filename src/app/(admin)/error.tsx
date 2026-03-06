"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">[Admin] 오류 발생</h2>
        <p className="text-sm text-red-500 font-mono mb-4 break-all">{error.message}</p>
        <button
          onClick={reset}
          className="px-5 py-2 bg-gray-800 text-white rounded-xl text-sm hover:bg-gray-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
