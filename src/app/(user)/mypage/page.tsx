"use client";

import { useState, useEffect, Suspense } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getMyProfile, updateProfile, changePassword, sendVerificationEmail } from "./actions";

// ── Skin type labels ──
const SKIN_TYPE_LABELS: Record<string, string> = {
  DRY: "건성",
  OILY: "지성",
  COMBINATION: "복합성",
  SENSITIVE: "민감성",
  NORMAL: "중성",
};

interface Profile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  emailVerified: string | null;
  profileImage: string | null;
  onboardingStatus: string;
  createdAt: string;
  skinProfile: {
    skinType: string;
    skinConcerns: string[];
    sensitivityLevel: number;
  } | null;
  compareCount: number;
  productCount: number;
}

function MyPageContent() {
  const searchParams = useSearchParams();
  const verifyResult = searchParams.get("verify");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Verification states
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [phoneVerifyMsg, setPhoneVerifyMsg] = useState<string | null>(null);

  // Verify result from URL
  const [verifyBanner, setVerifyBanner] = useState<string | null>(null);

  useEffect(() => {
    if (verifyResult === "success") setVerifyBanner("이메일 인증이 완료되었습니다!");
    else if (verifyResult === "expired") setVerifyBanner("인증 링크가 만료되었습니다. 다시 시도해주세요.");
    else if (verifyResult === "invalid") setVerifyBanner("유효하지 않은 인증 링크입니다.");
    else if (verifyResult === "error") setVerifyBanner("인증 처리 중 오류가 발생했습니다.");
  }, [verifyResult]);

  useEffect(() => {
    async function load() {
      const result = await getMyProfile();
      if (result.success && result.profile) {
        setProfile(result.profile);
        setEditName(result.profile.name || "");
        setEditPhone(result.profile.phone || "");
      }
      setLoading(false);
    }
    load();
  }, []);

  // ── Profile update ──
  async function handleProfileSave() {
    setProfileSaving(true);
    setProfileMsg(null);
    const result = await updateProfile({ name: editName, phone: editPhone });
    if (result.success) {
      setProfileMsg({ type: "success", text: result.message || "저장되었습니다." });
      setEditingProfile(false);
      // Refresh profile
      const refreshed = await getMyProfile();
      if (refreshed.success && refreshed.profile) {
        setProfile(refreshed.profile);
      }
    } else {
      setProfileMsg({ type: "error", text: result.error || "저장에 실패했습니다." });
    }
    setProfileSaving(false);
  }

  // ── Password change ──
  async function handlePasswordChange() {
    setPwMsg(null);
    if (newPw !== newPwConfirm) {
      setPwMsg({ type: "error", text: "새 비밀번호가 일치하지 않습니다." });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: "error", text: "새 비밀번호는 8자 이상이어야 합니다." });
      return;
    }
    setPwSaving(true);
    const result = await changePassword(currentPw, newPw);
    if (result.success) {
      setPwMsg({ type: "success", text: result.message || "비밀번호가 변경되었습니다." });
      setCurrentPw("");
      setNewPw("");
      setNewPwConfirm("");
      setShowPasswordForm(false);
    } else {
      setPwMsg({ type: "error", text: result.error || "변경에 실패했습니다." });
    }
    setPwSaving(false);
  }

  // ── Email verification ──
  async function handleSendVerification() {
    setVerifyLoading(true);
    setVerifyMsg(null);
    const result = await sendVerificationEmail();
    if (result.success) {
      setVerifyMsg({ type: "success", text: "인증 메일이 발송되었습니다. 이메일을 확인해주세요." });
    } else {
      setVerifyMsg({ type: "error", text: result.error || "발송에 실패했습니다." });
    }
    setVerifyLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-[#6B7280]">프로필을 불러올 수 없습니다.</p>
      </div>
    );
  }

  const isEmailVerified = !!profile.emailVerified;

  return (
    <div className="pb-8">
      {/* Verify banner */}
      {verifyBanner && (
        <div
          className={`mb-5 rounded-xl p-3 text-center text-sm font-medium ${
            verifyResult === "success"
              ? "bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669]"
              : "bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]"
          }`}
        >
          {verifyBanner}
        </div>
      )}

      {/* Profile Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#ECFDF5] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={1.8}>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1F2937] leading-tight">마이페이지</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              가입일: {new Date(profile.createdAt).toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Profile Section ─── */}
      <div
        className="rounded-2xl bg-white p-5 mb-4"
        style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#1F2937] flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECFDF5]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </span>
            프로필 정보
          </h3>
          {!editingProfile && (
            <button
              onClick={() => {
                setEditingProfile(true);
                setProfileMsg(null);
              }}
              className="text-xs font-semibold text-[#10B981] hover:underline"
            >
              수정
            </button>
          )}
        </div>

        {editingProfile ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6B7280]">이름</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full rounded-xl border-2 border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#1F2937] placeholder:text-[#D1D5DB] focus:border-[#10B981] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6B7280]">이메일</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  className="flex-1 rounded-xl border-2 border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280] cursor-not-allowed"
                />
                {isEmailVerified ? (
                  <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#ECFDF5] text-[11px] font-semibold text-[#059669] border border-[#A7F3D0] whitespace-nowrap">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    인증됨
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#FFF7ED] text-[11px] font-semibold text-[#D97706] border border-[#FDE68A] whitespace-nowrap">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
                    </svg>
                    미인증
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6B7280]">휴대폰 번호</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="01012345678"
                className="w-full rounded-xl border-2 border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#1F2937] placeholder:text-[#D1D5DB] focus:border-[#10B981] focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="btn-brand flex-1 py-2.5 text-sm disabled:opacity-60"
              >
                {profileSaving ? "저장 중..." : "저장"}
              </button>
              <button
                onClick={() => {
                  setEditingProfile(false);
                  setEditName(profile.name || "");
                  setEditPhone(profile.phone || "");
                  setProfileMsg(null);
                }}
                className="flex-1 py-2.5 rounded-xl border-2 border-[#E5E7EB] text-sm font-medium text-[#4B5563] hover:bg-[#F9FAFB]"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
              <span className="text-xs font-semibold text-[#6B7280]">이름</span>
              <span className="text-sm text-[#1F2937]">{profile.name || "미입력"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
              <span className="text-xs font-semibold text-[#6B7280]">이메일</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#1F2937]">{profile.email}</span>
                {isEmailVerified ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[10px] font-semibold text-[#059669] border border-[#A7F3D0]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    인증됨
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[10px] font-semibold text-[#D97706] border border-[#FDE68A]">
                    미인증
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
              <span className="text-xs font-semibold text-[#6B7280]">휴대폰</span>
              <span className="text-sm text-[#1F2937]">{profile.phone || "미입력"}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-semibold text-[#6B7280]">가입일</span>
              <span className="text-sm text-[#1F2937]">
                {new Date(profile.createdAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
          </div>
        )}

        {profileMsg && (
          <div
            className={`mt-3 rounded-xl p-2.5 text-center text-xs ${
              profileMsg.type === "success"
                ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
            }`}
          >
            {profileMsg.text}
          </div>
        )}
      </div>

      {/* ─── Email Verification ─── */}
      {!isEmailVerified && (
        <div
          className="rounded-2xl bg-[#FFF7ED] p-4 mb-4"
          style={{ border: "1px solid #FDE68A" }}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FDE68A]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#92400E] mb-1">이메일 인증이 필요합니다</p>
              <p className="text-xs text-[#A16207] mb-3">이메일 인증을 완료하면 모든 기능을 이용할 수 있습니다.</p>
              <button
                onClick={handleSendVerification}
                disabled={verifyLoading}
                className="px-4 py-2 rounded-lg bg-[#F59E0B] text-white text-xs font-semibold hover:bg-[#D97706] transition-colors disabled:opacity-60"
              >
                {verifyLoading ? "발송 중..." : "이메일 인증"}
              </button>
              {verifyMsg && (
                <p
                  className={`mt-2 text-xs ${
                    verifyMsg.type === "success" ? "text-[#059669]" : "text-[#DC2626]"
                  }`}
                >
                  {verifyMsg.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Phone Verification (UI placeholder) ─── */}
      {profile.phone && (
        <div
          className="rounded-2xl bg-white p-4 mb-4"
          style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3F4F6]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={2}>
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="12" y1="18" x2="12" y2="18" strokeWidth={3} strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-medium text-[#1F2937]">휴대폰 본인인증</p>
                <p className="text-xs text-[#6B7280]">{profile.phone}</p>
              </div>
            </div>
            <button
              onClick={() => setPhoneVerifyMsg("휴대폰 본인인증 기능은 준비 중입니다")}
              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold text-[#4B5563] hover:bg-[#F9FAFB] transition-colors"
            >
              본인인증
            </button>
          </div>
          {phoneVerifyMsg && (
            <div className="mt-3 rounded-lg bg-[#F3F4F6] p-2.5 text-center text-xs text-[#6B7280]">
              {phoneVerifyMsg}
            </div>
          )}
        </div>
      )}

      {/* ─── Security Section ─── */}
      <div
        className="rounded-2xl bg-white p-5 mb-4"
        style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <h3 className="text-base font-bold text-[#1F2937] mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECFDF5]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </span>
          보안
        </h3>

        {showPasswordForm ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6B7280]">현재 비밀번호</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="현재 비밀번호를 입력하세요"
                autoComplete="current-password"
                className="w-full rounded-xl border-2 border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#1F2937] placeholder:text-[#D1D5DB] focus:border-[#10B981] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6B7280]">새 비밀번호</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="8자 이상 입력하세요"
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border-2 border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#1F2937] placeholder:text-[#D1D5DB] focus:border-[#10B981] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6B7280]">새 비밀번호 확인</label>
              <input
                type="password"
                value={newPwConfirm}
                onChange={(e) => setNewPwConfirm(e.target.value)}
                placeholder="새 비밀번호를 다시 입력하세요"
                autoComplete="new-password"
                className={`w-full rounded-xl border-2 bg-white px-4 py-3 text-sm text-[#1F2937] placeholder:text-[#D1D5DB] focus:outline-none ${
                  newPwConfirm && newPw !== newPwConfirm
                    ? "border-[#EF4444] focus:border-[#EF4444]"
                    : "border-[#E5E7EB] focus:border-[#10B981]"
                }`}
              />
              {newPwConfirm && newPw !== newPwConfirm && (
                <p className="mt-1 text-xs text-[#EF4444]">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handlePasswordChange}
                disabled={pwSaving || !currentPw || !newPw || !newPwConfirm}
                className="btn-brand flex-1 py-2.5 text-sm disabled:opacity-60"
              >
                {pwSaving ? "변경 중..." : "비밀번호 변경"}
              </button>
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPw("");
                  setNewPw("");
                  setNewPwConfirm("");
                  setPwMsg(null);
                }}
                className="flex-1 py-2.5 rounded-xl border-2 border-[#E5E7EB] text-sm font-medium text-[#4B5563] hover:bg-[#F9FAFB]"
              >
                취소
              </button>
            </div>
            {pwMsg && (
              <div
                className={`rounded-xl p-2.5 text-center text-xs ${
                  pwMsg.type === "success"
                    ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                    : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                }`}
              >
                {pwMsg.text}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => {
                setShowPasswordForm(true);
                setPwMsg(null);
              }}
              className="w-full flex items-center justify-between py-3 px-1 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] rounded-lg transition-colors"
            >
              <span className="text-sm text-[#1F2937]">비밀번호 변경</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {pwMsg && (
              <div
                className={`rounded-xl p-2.5 text-center text-xs ${
                  pwMsg.type === "success"
                    ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                    : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                }`}
              >
                {pwMsg.text}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── My Skin Profile ─── */}
      <div
        className="rounded-2xl bg-white p-5 mb-4"
        style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <h3 className="text-base font-bold text-[#1F2937] mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECFDF5]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </span>
          내 피부 프로필
        </h3>

        {profile.skinProfile ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
              <span className="text-xs font-semibold text-[#6B7280]">피부 타입</span>
              <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-sm font-medium text-[#059669] border border-[#A7F3D0]">
                {SKIN_TYPE_LABELS[profile.skinProfile.skinType] || profile.skinProfile.skinType}
              </span>
            </div>
            <div className="py-2 border-b border-[#F3F4F6]">
              <span className="text-xs font-semibold text-[#6B7280] block mb-2">피부 고민</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skinProfile.skinConcerns.length > 0 ? (
                  profile.skinProfile.skinConcerns.map((concern) => (
                    <span
                      key={concern}
                      className="px-2.5 py-1 rounded-full bg-[#F3F4F6] text-xs text-[#4B5563]"
                    >
                      {concern}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#9CA3AF]">등록된 고민이 없습니다</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-semibold text-[#6B7280]">민감도</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`w-4 h-4 rounded-full ${
                      level <= profile.skinProfile!.sensitivityLevel
                        ? level <= 2
                          ? "bg-[#10B981]"
                          : level <= 3
                          ? "bg-[#F59E0B]"
                          : "bg-[#EF4444]"
                        : "bg-[#E5E7EB]"
                    }`}
                  />
                ))}
                <span className="text-xs text-[#6B7280] ml-1">
                  {profile.skinProfile.sensitivityLevel}/5
                </span>
              </div>
            </div>
            <Link
              href="/onboarding"
              className="flex items-center justify-center w-full py-2.5 mt-2 rounded-xl border-2 border-[#E5E7EB] text-sm font-medium text-[#4B5563] hover:bg-[#F9FAFB] transition-colors"
            >
              피부 프로필 다시 설정하기
            </Link>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-[#6B7280] mb-4">아직 피부 프로필이 등록되지 않았습니다.</p>
            <Link
              href="/onboarding"
              className="btn-brand inline-block px-6 py-2.5 text-sm"
            >
              피부 프로필 설정하기
            </Link>
          </div>
        )}
      </div>

      {/* ─── Activity Summary ─── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link
          href="/compare"
          className="rounded-2xl p-4 bg-white text-center hover:shadow-md transition-shadow"
          style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF5] mx-auto mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-[#1F2937]">비교 분석</p>
          <p className="text-2xl font-extrabold text-[#10B981] mt-1">
            {profile.compareCount}
            <span className="text-sm font-medium text-[#6B7280]">건</span>
          </p>
        </Link>
        <Link
          href="/my-products"
          className="rounded-2xl p-4 bg-white text-center hover:shadow-md transition-shadow"
          style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF2FF] mx-auto mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm font-bold text-[#1F2937]">등록 제품</p>
          <p className="text-2xl font-extrabold text-[#6366F1] mt-1">
            {profile.productCount}
            <span className="text-sm font-medium text-[#6B7280]">개</span>
          </p>
        </Link>
      </div>

      {/* ─── Logout ─── */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full mt-2 py-3 rounded-xl text-sm font-semibold text-[#EF4444] bg-white transition-colors hover:bg-[#FEF2F2]"
        style={{ border: "1px solid #FECACA" }}
      >
        로그아웃
      </button>
    </div>
  );
}

export default function MyPage() {
  return (
    <Suspense>
      <MyPageContent />
    </Suspense>
  );
}
