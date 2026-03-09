"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { changePassword } from "./actions";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await changePassword(formData);

      if (result.success) {
        // 비밀번호 변경 성공 - 세션 갱신을 위해 재로그인 유도
        // JWT 토큰의 mustChangePassword가 갱신되어야 하므로 signOut 후 재로그인
        await signOut({ callbackUrl: "/admin/login?message=password-changed" });
      } else {
        setError(result.error ?? "비밀번호 변경에 실패했습니다.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl font-extrabold tracking-tight text-white">COSFIT</span>
            <span className="rounded-md bg-red-900/40 px-2 py-0.5 text-[11px] font-semibold text-red-300">
              Admin
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">비밀번호 변경</h1>
          <p className="text-sm text-[#8B92A5]">
            보안을 위해 초기 비밀번호를 변경해주세요.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-[#1E2130] bg-[#141620] p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-900/20 border border-red-800/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-[#8B92A5] mb-1.5">
                현재 비밀번호
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-[#2A2E42] bg-[#0F1117] px-4 py-2.5 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10"
                  placeholder="현재 비밀번호 입력"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555B6E] hover:text-[#8B92A5] transition-colors"
                >
                  {showCurrent ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-[#8B92A5] mb-1.5">
                새 비밀번호
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNew ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[#2A2E42] bg-[#0F1117] px-4 py-2.5 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10"
                  placeholder="새 비밀번호 입력"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555B6E] hover:text-[#8B92A5] transition-colors"
                >
                  {showNew ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-[#555B6E]">
                8자 이상, 영문 + 숫자 + 특수문자 포함
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#8B92A5] mb-1.5">
                새 비밀번호 확인
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[#2A2E42] bg-[#0F1117] px-4 py-2.5 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10"
                  placeholder="새 비밀번호 다시 입력"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555B6E] hover:text-[#8B92A5] transition-colors"
                >
                  {showConfirm ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#141620] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        </div>

        {/* Info */}
        <p className="mt-4 text-center text-xs text-[#555B6E]">
          비밀번호 변경 후 다시 로그인해야 합니다.
        </p>
      </div>
    </div>
  );
}
