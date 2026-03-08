"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Role = "USER" | "PARTNER";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "회원가입에 실패했습니다.");
        return;
      }

      router.push("/login?signup=success");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel (desktop) */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-[#C4816A] via-[#B5705A] to-[#8B4A36] flex-col items-center justify-center px-12 relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-white/10" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[260px] h-[260px] rounded-full bg-white/5" />
        <div className="relative z-10 text-white text-center">
          <h1 className="text-5xl font-black tracking-tight mb-3">COSFIT</h1>
          <p className="text-lg text-white/80 mb-8">나만의 뷰티 기준을 만들어보세요</p>
          <div className="bg-white/10 rounded-2xl p-5 text-left">
            <p className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wide">회원 혜택</p>
            <div className="flex flex-col gap-2.5">
              {[
                "AI 피부 분석 무제한 이용",
                "FIT Score로 맞춤 화장품 추천",
                "성분 위험도 즉시 확인",
                "인생템 목록 저장 및 관리",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2.5 text-sm text-white/80">
                  <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#FDFBF9]">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-black text-[#C4816A] tracking-tight">COSFIT</h1>
            <p className="text-sm text-[#8B7E76] mt-1">나만의 뷰티 기준을 만들어보세요</p>
          </div>

          <h2 className="text-2xl font-bold text-[#2D2420] mb-6">회원가입</h2>

          {/* Role selector */}
          <div className="flex gap-2 mb-5">
            {(["USER", "PARTNER"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  role === r
                    ? "border-[#C4816A] bg-[#C4816A] text-white"
                    : "border-[#EDE6DF] text-[#8B7E76] hover:border-[#C4816A]/30"
                }`}
              >
                {r === "USER" ? "일반 회원" : "파트너 (브랜드)"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8B7E76] mb-1.5">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                required
                className="w-full px-4 py-3.5 bg-white border-2 border-[#EDE6DF] rounded-xl text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none focus:border-[#C4816A] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B7E76] mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                required
                className="w-full px-4 py-3.5 bg-white border-2 border-[#EDE6DF] rounded-xl text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none focus:border-[#C4816A] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B7E76] mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상 입력하세요"
                required
                minLength={8}
                className="w-full px-4 py-3.5 bg-white border-2 border-[#EDE6DF] rounded-xl text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none focus:border-[#C4816A] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B7E76] mb-1.5">비밀번호 확인</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                required
                className={`w-full px-4 py-3.5 bg-white border-2 rounded-xl text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none transition-colors ${
                  passwordConfirm && password !== passwordConfirm
                    ? "border-[#C47070] focus:border-[#C47070]"
                    : "border-[#EDE6DF] focus:border-[#C4816A]"
                }`}
              />
            </div>

            {error && (
              <div className="p-3 bg-[#FFF0EE] border border-[#C47070]/30 rounded-xl text-xs text-[#C47070] text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#C4816A] hover:bg-[#A66B55] text-white font-bold rounded-xl text-sm disabled:opacity-60 transition-colors shadow-sm mt-2"
            >
              {isLoading ? "처리 중..." : "회원가입"}
            </button>
          </form>

          <p className="text-center text-xs text-[#8B7E76] mt-6">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-[#C4816A] font-bold hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
