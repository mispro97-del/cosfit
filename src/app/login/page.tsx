"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type LoginType = "user" | "partner" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const typeParam = searchParams.get("type") as LoginType | null;

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
    user: "일반 로그인",
    partner: "파트너 로그인",
    admin: "어드민 로그인",
  };

  return (
    <div className="min-h-screen bg-[#FBF7F4] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#C4816A] tracking-tight">COSFIT</h1>
          <p className="text-sm text-[#8B7E76] mt-1">내 피부에 맞는 화장품을 찾아드려요</p>
        </div>

        {/* 탭 */}
        <div role="tablist" aria-label="로그인 유형 선택" className="flex gap-1 bg-[#EDE6DF] rounded-2xl p-1 mb-6">
          {(["user", "partner", "admin"] as LoginType[]).map((type) => (
            <button
              key={type}
              role="tab"
              aria-selected={loginType === type}
              aria-controls="login-form"
              onClick={() => setLoginType(type)}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
                loginType === type
                  ? "bg-white text-[#2D2420] shadow-sm"
                  : "text-[#8B7E76]"
              }`}
            >
              {TAB_LABELS[type]}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <form
          id="login-form"
          role="tabpanel"
          onSubmit={handleSubmit}
          aria-label={`${TAB_LABELS[loginType]} 폼`}
          className="bg-white rounded-3xl p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-[#8B7E76] mb-1">
                이메일
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                required
                autoComplete="email"
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                className="w-full px-4 py-3 bg-[#FBF7F4] border border-[#EDE6DF] rounded-xl text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none focus:border-[#C4816A]"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-[#8B7E76] mb-1">
                비밀번호
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                autoComplete="current-password"
                aria-required="true"
                aria-invalid={!!error}
                className="w-full px-4 py-3 bg-[#FBF7F4] border border-[#EDE6DF] rounded-xl text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none focus:border-[#C4816A]"
              />
            </div>
          </div>

          {error && (
            <p id="login-error" role="alert" aria-live="polite" className="mt-3 text-xs text-[#D4665A] text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label={isLoading ? "로그인 처리 중" : "로그인"}
            className="w-full mt-5 py-3.5 bg-[#C4816A] text-white font-semibold rounded-2xl text-sm disabled:opacity-60 transition-opacity"
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>

          {loginType === "user" && (
            <>
              <div className="flex items-center gap-3 my-4" aria-hidden="true">
                <div className="flex-1 h-px bg-[#EDE6DF]" />
                <span className="text-xs text-[#C5B8B1]">또는</span>
                <div className="flex-1 h-px bg-[#EDE6DF]" />
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSocialLogin("google")}
                  aria-label="Google 계정으로 로그인"
                  className="w-full py-3 border border-[#EDE6DF] rounded-2xl text-sm text-[#2D2420] font-medium flex items-center justify-center gap-2 hover:bg-[#FBF7F4] transition-colors"
                >
                  <span aria-hidden="true">🔵</span> Google로 계속하기
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin("kakao")}
                  aria-label="카카오 계정으로 로그인"
                  className="w-full py-3 bg-[#FEE500] rounded-2xl text-sm text-[#2D2420] font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <span aria-hidden="true">💬</span> 카카오로 계속하기
                </button>
              </div>
            </>
          )}

          <p className="text-center text-xs text-[#8B7E76] mt-5">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-[#C4816A] font-medium">
              회원가입
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
