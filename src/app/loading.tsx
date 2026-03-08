export default function GlobalLoading() {
  return (
    <div className="mobile-shell-bg">
    <div className="mobile-shell min-h-screen flex items-center justify-center bg-[#FFFFFF]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#10B981]/20 border-t-[#10B981] rounded-full animate-spin" />
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    </div>
    </div>
  );
}
