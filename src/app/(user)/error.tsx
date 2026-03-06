"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UserError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[UserError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">😢</p>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">페이지를 불러올 수 없어요</h2>
        <p className="text-sm text-gray-500 mb-6">{error.message || "알 수 없는 오류가 발생했습니다."}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            이전으로
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-[#C4816A] text-white rounded-xl text-sm hover:bg-[#b3705a] transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}
