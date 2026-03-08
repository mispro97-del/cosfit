"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function PartnerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      callbackUrl: "/partner/dashboard",
    });

    setIsLoading(false);

    if (result?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    window.location.href = "/partner/dashboard";
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: `
          linear-gradient(135deg, #F8FAFB 0%, #EFF6F3 50%, #F8FAFB 100%)
        `,
      }}
    >
      {/* Subtle background pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(16,185,129,0.04) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(16,185,129,0.03) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(16,185,129,0.02) 0%, transparent 70%)
          `,
        }}
      />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1
              className="text-4xl font-black tracking-tight text-[#1F2937]"
              style={{ letterSpacing: "-0.03em" }}
            >
              COSFIT
            </h1>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#10B981] text-white text-[11px] font-bold uppercase tracking-wider">
              Partner
            </span>
          </div>
          <p className="text-sm text-[#6B7280]">
            입점사 전용 관리 포털
          </p>
        </div>

        {/* Login card */}
        <div
          className="bg-white rounded-2xl px-8 py-9 shadow-sm"
          style={{
            border: "1px solid #E5E7EB",
            boxShadow: "0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <h2 className="text-xl font-bold text-[#1F2937] mb-6">로그인</h2>

          {signupSuccess && (
            <div className="mb-5 rounded-xl border border-[#10B981]/30 bg-[#ECFDF5] p-3.5 text-center text-sm font-medium text-[#059669]">
              <svg
                className="inline-block w-4 h-4 mr-1.5 -mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              가입이 완료되었습니다. 로그인해 주세요.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="business@company.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 bg-[#F9FAFB] border-2 border-[#E5E7EB] rounded-xl text-sm text-[#1F2937] placeholder:text-[#C5C9D0] focus:outline-none focus:border-[#10B981] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3.5 bg-[#F9FAFB] border-2 border-[#E5E7EB] rounded-xl text-sm text-[#1F2937] placeholder:text-[#C5C9D0] focus:outline-none focus:border-[#10B981] focus:bg-white transition-all"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-[#EF4444]/20 bg-[#FEF2F2] p-3 text-center text-xs font-medium text-[#EF4444]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-2"
              style={{
                boxShadow: "0 2px 8px rgba(16,185,129,0.25)",
              }}
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
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-[#6B7280] mt-6">
          아직 입점 계정이 없으신가요?{" "}
          <Link
            href="/partner/signup"
            className="font-bold text-[#10B981] hover:underline"
          >
            입점 신청하기
          </Link>
        </p>

        {/* Bottom note */}
        <p className="text-center text-[11px] text-[#9CA3AF] mt-4">
          일반 회원은{" "}
          <Link href="/login" className="text-[#6B7280] hover:underline">
            여기서 로그인
          </Link>
          하세요.
        </p>
      </div>
    </div>
  );
}

export default function PartnerLoginPage() {
  return (
    <Suspense>
      <PartnerLoginForm />
    </Suspense>
  );
}
