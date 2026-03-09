"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const signupSuccess = searchParams.get("signup") === "success";

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

    window.location.href = callbackUrl;
  }

  async function handleSocialLogin(provider: "google" | "kakao" | "naver" | "apple") {
    await signIn(provider, { callbackUrl });
  }

  return (
    <div className="mobile-shell-bg">
      <div className="mobile-shell min-h-screen flex flex-col">
        {/* Hero section — green gradient top */}
        <div
          className="relative flex flex-col items-center justify-center px-6 pt-16 pb-10 overflow-hidden"
          style={{ background: "var(--gradient-hero)" }}
        >
          {/* Decorative blobs */}
          <div
            className="absolute rounded-full"
            style={{
              width: 280,
              height: 280,
              top: -100,
              right: -80,
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 180,
              height: 180,
              bottom: -40,
              left: -60,
              background: "rgba(255,255,255,0.05)",
            }}
          />

          {/* Brand */}
          <div className="relative z-10 text-center animate-fade-in-up">
            <div
              className="text-5xl font-black text-white mb-2"
              style={{ letterSpacing: "-0.04em" }}
            >
              COSFIT
            </div>
            <p className="text-white/75 text-[15px]">
              내 피부를 위한 뷰티 AI
            </p>

            <div className="mt-6 flex flex-col gap-2.5 text-left">
              {[
                "인생템으로 나만의 피부 기준 생성",
                "AI가 성분을 분석해 FIT Score 산출",
                "내 피부에 딱 맞는 화장품 추천",
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="text-[10px] font-black w-5 shrink-0"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    0{i + 1}
                  </span>
                  <span
                    className="text-[13px]"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form card */}
        <div
          className="animate-slide-up flex-1 rounded-t-[28px] px-6 pt-7 pb-10 -mt-4 relative z-10"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 -8px 40px rgba(31,41,55,0.12)",
          }}
        >
          <div className="mx-auto w-full max-w-[400px]">
            {/* Drag handle */}
            <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-[#E5E7EB]" />

            {signupSuccess && (
              <div className="mb-5 rounded-xl border border-[#10B981]/30 bg-[#ECFDF5] p-3 text-center text-sm font-medium text-[#10B981]">
                회원가입 완료! 로그인해 주세요.
              </div>
            )}

            <h2 className="text-xl font-bold text-[#1F2937] mb-5">로그인</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#6B7280]">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일을 입력하세요"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border-2 border-[#E5E7EB] bg-white px-4 py-3.5 text-sm text-[#1F2937] placeholder:text-[#D1D5DB] transition-colors focus:border-[#10B981] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#6B7280]">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border-2 border-[#E5E7EB] bg-white px-4 py-3.5 text-sm text-[#1F2937] placeholder:text-[#D1D5DB] transition-colors focus:border-[#10B981] focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-[#EF4444]/20 bg-[#FEF2F2] p-3 text-center text-xs text-[#EF4444]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-brand w-full py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                style={{ height: 56 }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    로그인 중...
                  </span>
                ) : (
                  "로그인"
                )}
              </button>
            </form>

            {/* Social login divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E5E7EB]" />
              <span className="text-xs text-[#D1D5DB]">또는 소셜 로그인</span>
              <div className="h-px flex-1 bg-[#E5E7EB]" />
            </div>

            {/* Social login buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSocialLogin("google")}
                className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-[#E5E7EB] bg-white py-3.5 text-sm font-medium text-[#1F2937] transition-all hover:border-[#10B981]/40 hover:shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M17.64 9.20C17.64 8.57 17.58 7.95 17.48 7.36H9V10.85H13.84C13.64 11.97 13.00 12.92 12.05 13.56V15.82H14.96C16.66 14.25 17.64 11.95 17.64 9.20Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9 18C11.43 18 13.47 17.19 14.96 15.82L12.05 13.56C11.24 14.10 10.21 14.42 9 14.42C6.66 14.42 4.67 12.84 3.96 10.71H0.96V13.04C2.44 15.98 5.48 18 9 18Z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.96 10.71C3.78 10.17 3.68 9.59 3.68 9C3.68 8.41 3.78 7.83 3.96 7.29V4.96H0.96C0.35 6.17 0 7.55 0 9C0 10.45 0.35 11.83 0.96 13.04L3.96 10.71Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9 3.58C10.32 3.58 11.51 4.03 12.44 4.93L15.02 2.34C13.46 0.89 11.43 0 9 0C5.48 0 2.44 2.02 0.96 4.96L3.96 7.29C4.67 5.16 6.66 3.58 9 3.58Z"
                    fill="#EA4335"
                  />
                </svg>
                Google로 계속하기
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin("kakao")}
                className="flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-bold text-[#191919] transition-colors hover:opacity-90"
                style={{ background: "#FEE500" }}
              >
                <svg width="18" height="17" viewBox="0 0 18 17" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M9 0C4.03 0 0 3.13 0 6.99C0 9.39 1.52 11.51 3.83 12.77L2.93 16.24C2.86 16.52 3.18 16.74 3.42 16.58L7.42 13.92C7.94 13.99 8.47 14.02 9 14.02C13.97 14.02 18 10.89 18 7.03C18 3.17 13.97 0 9 0Z"
                    fill="#191919"
                  />
                </svg>
                카카오로 계속하기
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin("naver")}
                className="flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-bold text-white transition-colors hover:opacity-90"
                style={{ background: "#03C75A" }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M12.16 9.57L5.56 0H0V18H5.84V8.43L12.44 18H18V0H12.16V9.57Z"
                    fill="white"
                  />
                </svg>
                네이버로 계속하기
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin("apple")}
                className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-[#1F2937] bg-[#1F2937] py-3.5 text-sm font-bold text-white transition-colors hover:opacity-90"
              >
                <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
                  <path
                    d="M13.71 9.54C13.73 11.96 15.84 12.73 15.86 12.74C15.84 12.81 15.53 13.88 14.76 14.99C14.1 15.94 13.41 16.89 12.3 16.91C11.21 16.93 10.86 16.27 9.62 16.27C8.38 16.27 7.99 16.89 6.96 16.93C5.89 16.97 5.09 15.9 4.42 14.96C3.06 12.99 2.01 9.39 3.41 6.93C4.1 5.71 5.36 4.94 6.73 4.92C7.78 4.9 8.77 5.62 9.43 5.62C10.09 5.62 11.28 4.76 12.55 4.88C13.08 4.9 14.52 5.09 15.44 6.42C15.37 6.46 13.69 7.42 13.71 9.54ZM11.35 3.22C11.9 2.55 12.28 1.63 12.18 0.7C11.38 0.74 10.4 1.24 9.83 1.91C9.32 2.5 8.86 3.44 8.97 4.34C9.87 4.41 10.79 3.89 11.35 3.22Z"
                    fill="white"
                  />
                </svg>
                Apple로 계속하기
              </button>
            </div>

            <p className="mt-6 text-center text-xs text-[#6B7280]">
              계정이 없으신가요?{" "}
              <Link
                href="/signup"
                className="font-bold text-[#10B981] hover:underline"
              >
                회원가입
              </Link>
            </p>
          </div>
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
