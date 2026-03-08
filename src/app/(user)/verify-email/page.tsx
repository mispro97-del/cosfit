"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendVerificationEmail, checkEmailVerification } from "../mypage/actions";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "unverified" | "verified" | "sent" | "error">("loading");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function check() {
      const result = await checkEmailVerification();
      if (result.verified) {
        setStatus("verified");
      } else {
        setStatus("unverified");
      }
    }
    check();
  }, []);

  async function handleSendVerification() {
    setIsLoading(true);
    setMessage("");
    try {
      const result = await sendVerificationEmail();
      if (result.success) {
        setStatus("sent");
        setMessage("인증 메일이 발송되었습니다. 이메일을 확인해주세요.");
      } else {
        setMessage(result.error || "발송에 실패했습니다.");
      }
    } catch {
      setMessage("오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/mypage")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-[#1F2937]">이메일 인증</h1>
      </div>

      <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {status === "loading" && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[#6B7280]">확인 중...</p>
          </div>
        )}

        {status === "verified" && (
          <div className="text-center py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5] mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#1F2937] mb-2">이메일 인증 완료</h2>
            <p className="text-sm text-[#6B7280]">이메일이 성공적으로 인증되었습니다.</p>
          </div>
        )}

        {status === "unverified" && (
          <div className="text-center py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF7ED] mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#1F2937] mb-2">이메일 인증이 필요합니다</h2>
            <p className="text-sm text-[#6B7280] mb-6">
              인증 메일을 발송하여 이메일 주소를 확인해주세요.
            </p>
            <button
              onClick={handleSendVerification}
              disabled={isLoading}
              className="btn-brand px-8 py-3 text-sm disabled:opacity-60"
            >
              {isLoading ? "발송 중..." : "인증 메일 발송"}
            </button>
          </div>
        )}

        {status === "sent" && (
          <div className="text-center py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5] mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#1F2937] mb-2">메일이 발송되었습니다</h2>
            <p className="text-sm text-[#6B7280] mb-4">
              이메일에서 인증 링크를 클릭해주세요.<br />
              인증 후 이 페이지를 새로고침해주세요.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl border-2 border-[#E5E7EB] text-sm font-medium text-[#4B5563] hover:bg-[#F9FAFB] transition-colors"
            >
              새로고침
            </button>
          </div>
        )}

        {message && status !== "sent" && (
          <p className="mt-4 text-center text-sm text-[#EF4444]">{message}</p>
        )}
      </div>
    </div>
  );
}
