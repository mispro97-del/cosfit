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
    <div className="min-h-screen bg-[#FBF7F4] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#C4816A] tracking-tight">COSFIT</h1>
          <p className="text-sm text-[#8B7E76] mt-1">나만의 뷰티 기준을 만들어보세요</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#2D2420] mb-5">회원가입</h2>

          {/* 역할 선택 */}
          <div className="flex gap-2 mb-5">
            {(["USER", "PARTNER"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  role === r
                    ? "border-[#C4816A] bg-[#C4816A] text-white"
                    : "border-[#EDE6DF] text-[#8B7E76]"
                }`}
              >
                {r === "USER" ? "일반 회원" : "파트너 (브랜드)"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8B7E76] mb-1">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                required
                className="w-full px-4 py-3 bg-[#FBF7F4] border border-[#EDE6DF] rounded-xl text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none focus:border-[#C4816A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8B7E76] mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                required
                className="w-full px-4 py-3 bg-[#FBF7F4] border border-[#EDE6DF] rounded-xl text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none focus:border-[#C4816A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8B7E76] mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상 입력하세요"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-[#FBF7F4] border border-[#EDE6DF] rounded-xl text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none focus:border-[#C4816A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8B7E76] mb-1">비밀번호 확인</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                required
                className="w-full px-4 py-3 bg-[#FBF7F4] border border-[#EDE6DF] rounded-xl text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none focus:border-[#C4816A]"
              />
            </div>

            {error && (
              <p className="text-xs text-[#D4665A] text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#C4816A] text-white font-semibold rounded-2xl text-sm disabled:opacity-60 transition-opacity mt-2"
            >
              {isLoading ? "처리 중..." : "회원가입"}
            </button>
          </form>

          <p className="text-center text-xs text-[#8B7E76] mt-5">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-[#C4816A] font-medium">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
