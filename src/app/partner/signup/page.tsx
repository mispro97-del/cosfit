"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PartnerSignupPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
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
        body: JSON.stringify({
          name: `${companyName} (${representativeName})`,
          email,
          password,
          role: "PARTNER",
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "회원가입에 실패했습니다.");
        return;
      }

      router.push("/partner/login?signup=success");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

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
            입점사 계정 신청
          </p>
        </div>

        {/* Signup card */}
        <div
          className="bg-white rounded-2xl px-8 py-9 shadow-sm"
          style={{
            border: "1px solid #E5E7EB",
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <h2 className="text-xl font-bold text-[#1F2937] mb-1">입점 신청</h2>
          <p className="text-xs text-[#9CA3AF] mb-6">
            아래 정보를 입력하여 파트너 계정을 생성하세요.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">
                회사명
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="주식회사 코스핏"
                required
                autoComplete="organization"
                className="w-full px-4 py-3.5 bg-[#F9FAFB] border-2 border-[#E5E7EB] rounded-xl text-sm text-[#1F2937] placeholder:text-[#C5C9D0] focus:outline-none focus:border-[#10B981] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">
                담당자명
              </label>
              <input
                type="text"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder="홍길동"
                required
                autoComplete="name"
                className="w-full px-4 py-3.5 bg-[#F9FAFB] border-2 border-[#E5E7EB] rounded-xl text-sm text-[#1F2937] placeholder:text-[#C5C9D0] focus:outline-none focus:border-[#10B981] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">
                비즈니스 이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@company.com"
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
                placeholder="8자 이상 입력하세요"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3.5 bg-[#F9FAFB] border-2 border-[#E5E7EB] rounded-xl text-sm text-[#1F2937] placeholder:text-[#C5C9D0] focus:outline-none focus:border-[#10B981] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">
                비밀번호 확인
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                required
                autoComplete="new-password"
                className={`w-full px-4 py-3.5 bg-[#F9FAFB] border-2 rounded-xl text-sm text-[#1F2937] placeholder:text-[#C5C9D0] focus:outline-none transition-all ${
                  passwordMismatch
                    ? "border-[#EF4444] focus:border-[#EF4444]"
                    : "border-[#E5E7EB] focus:border-[#10B981] focus:bg-white"
                }`}
              />
              {passwordMismatch && (
                <p className="mt-1 text-[11px] text-[#EF4444]">
                  비밀번호가 일치하지 않습니다.
                </p>
              )}
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
                  처리 중...
                </span>
              ) : (
                "입점 신청하기"
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-[#6B7280] mt-6">
          이미 파트너 계정이 있으신가요?{" "}
          <Link
            href="/partner/login"
            className="font-bold text-[#10B981] hover:underline"
          >
            로그인
          </Link>
        </p>

        {/* Bottom note */}
        <p className="text-center text-[11px] text-[#9CA3AF] mt-4">
          일반 회원 가입은{" "}
          <Link href="/signup" className="text-[#6B7280] hover:underline">
            여기서 진행
          </Link>
          하세요.
        </p>
      </div>
    </div>
  );
}
