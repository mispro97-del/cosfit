"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type LoginType = "user" | "partner" | "admin";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const typeParam = searchParams.get("type") as LoginType | null;
  const signupSuccess = searchParams.get("signup") === "success";

  const [loginType, setLoginType] = useState<LoginType>(typeParam ?? "user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    router.push(callbackUrl);
  }

  async function handleSocialLogin(provider: "google" | "kakao") {
    await signIn(provider, { callbackUrl });
  }

  const TAB_LABELS: Record<LoginType, string> = {
    user: "일반",
    partner: "파트너",
    admin: "어드민",
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel (desktop) */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-[#C4816A] via-[#B5705A] to-[#8B4A36] flex-col items-center justify-center px-12 relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-white/10" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[260px] h-[260px] rounded-full bg-white/5" />
        <div className="relative z-10 text-white text-center">
          <h1 className="text-5xl font-black tracking-tight mb-3">COSFIT</h1>
          <p className="text-lg text-white/80 mb-8">내 피부를 위한 뷰티 AI</p>
          <div className="flex flex-col gap-4 text-left">
            {[
              { step: "01", text: "인생템으로 나만의 피부 기준 생성" },
              { step: "02", text: "AI가 성분을 분석해 FIT Score 산출" },
              { step: "03", text: "내 피부에 딱 맞는 화장품 추천" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-4">
                <span className="text-xs font-black text-white/40 w-6">{step}</span>
                <span className="text-sm text-white/80">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#FDFBF9]">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-black text-[#C4816A] tracking-tight">COSFIT</h1>
            <p className="text-sm text-[#8B7E76] mt-1">내 피부를 위한 뷰티 AI</p>
          </div>

          {signupSuccess && (
            <div className="mb-5 p-3 bg-[#EDF5F0] border border-[#6B9E7D]/30 rounded-xl text-sm text-[#6B9E7D] text-center font-medium">
              회원가입 완료! 로그인해 주세요.
            </div>
          )}

          <h2 className="text-2xl font-bold text-[#2D2420] mb-6">로그인</h2>

          {/* Type tabs */}
          <div className="flex gap-1 bg-[#F5EDE8] rounded-xl p-1 mb-6">
            {(["user", "partner", "admin"] as LoginType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => { setLoginType(type); setError(""); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  loginType === type
                    ? "bg-white text-[#C4816A] shadow-sm"
                    : "text-[#8B7E76] hover:text-[#2D2420]"
                }`}
              >
                {TAB_LABELS[type]}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8B7E76] mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 bg-white border-2 border-[#EDE6DF] rounded-xl text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none focus:border-[#C4816A] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B7E76] mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3.5 bg-white border-2 border-[#EDE6DF] rounded-xl text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none focus:border-[#C4816A] transition-colors"
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
              className="w-full py-4 bg-[#C4816A] hover:bg-[#A66B55] text-white font-bold rounded-xl text-sm disabled:opacity-60 transition-colors shadow-sm"
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {loginType === "user" && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[#EDE6DF]" />
                <span className="text-xs text-[#C5B8B1]">또는 소셜 로그인</span>
                <div className="flex-1 h-px bg-[#EDE6DF]" />
              </div>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleSocialLogin("google")}
                  className="w-full py-3.5 bg-white border-2 border-[#EDE6DF] hover:border-[#C4816A]/40 rounded-xl text-sm text-[#2D2420] font-medium flex items-center justify-center gap-3 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.20C17.64 8.57 17.58 7.95 17.48 7.36H9V10.85H13.84C13.64 11.97 13.00 12.92 12.05 13.56V15.82H14.96C16.66 14.25 17.64 11.95 17.64 9.20Z" fill="#4285F4"/>
                    <path d="M9 18C11.43 18 13.47 17.19 14.96 15.82L12.05 13.56C11.24 14.10 10.21 14.42 9 14.42C6.66 14.42 4.67 12.84 3.96 10.71H0.96V13.04C2.44 15.98 5.48 18 9 18Z" fill="#34A853"/>
                    <path d="M3.96 10.71C3.78 10.17 3.68 9.59 3.68 9C3.68 8.41 3.78 7.83 3.96 7.29V4.96H0.96C0.35 6.17 0 7.55 0 9C0 10.45 0.35 11.83 0.96 13.04L3.96 10.71Z" fill="#FBBC05"/>
                    <path d="M9 3.58C10.32 3.58 11.51 4.03 12.44 4.93L15.02 2.34C13.46 0.89 11.43 0 9 0C5.48 0 2.44 2.02 0.96 4.96L3.96 7.29C4.67 5.16 6.66 3.58 9 3.58Z" fill="#EA4335"/>
                  </svg>
                  Google로 계속하기
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin("kakao")}
                  className="w-full py-3.5 bg-[#FEE500] hover:bg-[#F5DC00] rounded-xl text-sm text-[#191919] font-bold flex items-center justify-center gap-3 transition-colors"
                >
                  <svg width="18" height="17" viewBox="0 0 18 17" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M9 0C4.03 0 0 3.13 0 6.99C0 9.39 1.52 11.51 3.83 12.77L2.93 16.24C2.86 16.52 3.18 16.74 3.42 16.58L7.42 13.92C7.94 13.99 8.47 14.02 9 14.02C13.97 14.02 18 10.89 18 7.03C18 3.17 13.97 0 9 0Z" fill="#191919"/>
                  </svg>
                  카카오로 계속하기
                </button>
              </div>
            </>
          )}

          <p className="text-center text-xs text-[#8B7E76] mt-6">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-[#C4816A] font-bold hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
