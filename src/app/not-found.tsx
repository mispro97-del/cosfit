import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mobile-shell-bg">
    <div className="mobile-shell min-h-screen flex flex-col items-center justify-center bg-[#FFFFFF] px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-[#10B981]/20 mb-2">404</div>
        <div className="w-16 h-1 bg-[#10B981] mx-auto mb-6 rounded-full" />
        <h1 className="text-2xl font-semibold text-gray-800 mb-3">
          페이지를 찾을 수 없어요
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          요청하신 페이지가 삭제되었거나 주소가 변경되었을 수 있어요.
          <br />
          올바른 주소인지 다시 한번 확인해 주세요.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2.5 bg-[#10B981] text-white rounded-xl text-sm font-medium hover:bg-[#059669] transition-colors"
          >
            홈으로 돌아가기
          </Link>
          <Link
            href="/compare"
            className="px-6 py-2.5 border border-[#10B981] text-[#10B981] rounded-xl text-sm font-medium hover:bg-[#10B981]/5 transition-colors"
          >
            제품 분석하기
          </Link>
        </div>
      </div>
    </div>
    </div>
  );
}
