export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF7F4]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#C4816A]/20 border-t-[#C4816A] rounded-full animate-spin" />
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    </div>
  );
}
