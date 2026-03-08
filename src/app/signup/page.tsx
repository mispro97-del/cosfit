"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
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
        body: JSON.stringify({ email, password }),
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
    <div className="mobile-shell-bg">
      <div className="mobile-shell min-h-screen flex flex-col">
        {/* Hero section */}
        <div
          className="relative flex flex-col items-center justify-center px-6 pt-14 pb-8 overflow-hidden"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: 260,
              height: 260,
              top: -90,
              right: -70,
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 160,
              height: 160,
              bottom: -30,
              left: -50,
              background: "rgba(255,255,255,0.05)",
            }}
          />

          <div className="relative z-10 text-center animate-fade-in-up">
            <div
              className="text-4xl font-black text-white mb-1.5"
              style={{ letterSpacing: "-0.04em" }}
            >
              COSFIT
            </div>
            <p className="text-white/75 text-[14px]">
              나만의 뷰티 기준을 만들어보세요
            </p>
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
            <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-[#E5E7EB]" />

            <h2 className="text-xl font-bold text-[#1F2937] mb-5">회원가입</h2>

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
                  placeholder="8자 이상 입력하세요"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl border-2 border-[#E5E7EB] bg-white px-4 py-3.5 text-sm text-[#1F2937] placeholder:text-[#D1D5DB] transition-colors focus:border-[#10B981] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#6B7280]">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                  autoComplete="new-password"
                  className={`w-full rounded-xl border-2 bg-white px-4 py-3.5 text-sm text-[#1F2937] placeholder:text-[#D1D5DB] transition-colors focus:outline-none ${
                    passwordConfirm && password !== passwordConfirm
                      ? "border-[#EF4444] focus:border-[#EF4444]"
                      : "border-[#E5E7EB] focus:border-[#10B981]"
                  }`}
                />
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="mt-1.5 text-xs text-[#EF4444]">
                    비밀번호가 일치하지 않습니다.
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-[#EF4444]/20 bg-[#FEF2F2] p-3 text-center text-xs text-[#EF4444]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-brand w-full py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60 mt-2"
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
                    처리 중...
                  </span>
                ) : (
                  "회원가입"
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-[#9CA3AF]">
              추가 정보는 마이페이지에서 입력할 수 있습니다
            </p>

            <p className="mt-4 text-center text-xs text-[#6B7280]">
              이미 계정이 있으신가요?{" "}
              <Link
                href="/login"
                className="font-bold text-[#10B981] hover:underline"
              >
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
