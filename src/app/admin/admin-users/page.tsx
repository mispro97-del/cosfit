"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  toggleOtpRequirement,
  getOtpRequirement,
  disableOtp,
  checkIsSuperAdmin,
  resetAdminPassword,
  type AdminUserItem,
} from "./actions";
import {
  ADMIN_MENUS,
  createDefaultPermissions,
  type AdminPermissions,
  type MenuPermission,
} from "@/lib/admin-permissions";

// ── Types ──

type ModalMode = "create" | "edit" | null;

interface FormState {
  email: string;
  name: string;
  password: string;
  permissions: AdminPermissions;
}

const EMPTY_FORM: FormState = {
  email: "",
  name: "",
  password: "",
  permissions: createDefaultPermissions(),
};

// ── Main Page ──

export default function AdminUsersPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset password state
  const [resetPwId, setResetPwId] = useState<string | null>(null);
  const [resetPwValue, setResetPwValue] = useState("");

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [users, superAdmin, otp] = await Promise.all([
        getAdminUsers(),
        checkIsSuperAdmin(),
        getOtpRequirement(),
      ]);
      setAdminUsers(users);
      setIsSuperAdmin(superAdmin);
      setOtpRequired(otp);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Handlers ──

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModalMode("create");
    setError("");
  };

  const openEdit = (au: AdminUserItem) => {
    setForm({
      email: au.email,
      name: au.name ?? "",
      password: "",
      permissions: au.permissions,
    });
    setEditingId(au.id);
    setModalMode("edit");
    setError("");
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      if (modalMode === "create") {
        if (!form.email || !form.name || !form.password) {
          setError("모든 필드를 입력해주세요.");
          setSaving(false);
          return;
        }
        await createAdminUser({
          email: form.email,
          name: form.name,
          password: form.password,
          permissions: form.permissions,
        });
      } else if (modalMode === "edit" && editingId) {
        await updateAdminUser(editingId, {
          name: form.name,
          permissions: form.permissions,
        });
      }
      setModalMode(null);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (adminUserId: string) => {
    try {
      await deleteAdminUser(adminUserId);
      setDeleteConfirmId(null);
      await loadData();
    } catch (e: any) {
      setError(e.message);
      setDeleteConfirmId(null);
    }
  };

  const handleToggleOtp = async () => {
    try {
      const result = await toggleOtpRequirement(!otpRequired);
      setOtpRequired(result.enabled);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDisableOtp = async (adminUserId: string) => {
    try {
      await disableOtp(adminUserId);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPwId || !resetPwValue) return;
    try {
      await resetAdminPassword(resetPwId, resetPwValue);
      setResetPwId(null);
      setResetPwValue("");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const togglePermission = (menuKey: string, perm: keyof MenuPermission) => {
    setForm((prev) => {
      const current = prev.permissions.menuPermissions[menuKey] ?? {
        view: false,
        create: false,
        edit: false,
      };
      return {
        ...prev,
        permissions: {
          menuPermissions: {
            ...prev.permissions.menuPermissions,
            [menuKey]: { ...current, [perm]: !current[perm] },
          },
        },
      };
    });
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-[#8B92A5]">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white m-0">
            관리자 계정 관리
          </h1>
          <p className="text-sm text-[#8B92A5] mt-1">
            관리자 계정 생성 / 권한 관리 / OTP 설정
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Global OTP Toggle */}
          {isSuperAdmin && (
            <button
              onClick={handleToggleOtp}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                otpRequired
                  ? "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                  : "bg-[#1A1E2E] text-[#8B92A5] hover:bg-[#252A3A]"
              }`}
            >
              <span className="text-sm">{otpRequired ? "🔒" : "🔓"}</span>
              2차 인증 {otpRequired ? "필수" : "선택"}
            </button>
          )}
          {/* Add Account */}
          {isSuperAdmin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              계정 추가
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-400">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-3 text-red-500 hover:text-red-300"
          >
            닫기
          </button>
        </div>
      )}

      {/* Admin Users Table */}
      <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D3348]">
              {["이름", "이메일", "권한", "OTP", "마지막 로그인", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-[#555B6E]"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {adminUsers.map((au) => (
              <tr
                key={au.id}
                className="border-b border-[#1E2234] hover:bg-[#1E2234] transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[#C8CDD8] font-medium">
                      {au.name ?? "-"}
                    </span>
                    {au.isSuperAdmin && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300">
                        Super Admin
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-[#8B92A5] text-xs">
                  {au.email}
                </td>
                <td className="px-4 py-3">
                  <PermissionSummary permissions={au.permissions} isSuperAdmin={au.isSuperAdmin} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      au.otpEnabled
                        ? "bg-emerald-900/30 text-emerald-400"
                        : "bg-[#252A3A] text-[#555B6E]"
                    }`}
                  >
                    {au.otpEnabled ? "활성" : "미설정"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#8B92A5] text-xs">
                  {au.lastLoginAt
                    ? new Date(au.lastLoginAt).toLocaleString("ko-KR")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  {isSuperAdmin && !au.isSuperAdmin && (
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(au)}
                        className="px-2 py-1 text-xs text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => {
                          setResetPwId(au.id);
                          setResetPwValue("");
                        }}
                        className="px-2 py-1 text-xs text-amber-400 hover:bg-amber-900/30 rounded transition-colors"
                      >
                        비밀번호
                      </button>
                      {au.otpEnabled && (
                        <button
                          onClick={() => handleDisableOtp(au.id)}
                          className="px-2 py-1 text-xs text-[#8B92A5] hover:bg-[#252A3A] rounded transition-colors"
                        >
                          OTP해제
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteConfirmId(au.id)}
                        className="px-2 py-1 text-xs text-red-400 hover:bg-red-900/30 rounded transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {adminUsers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-[#555B6E]"
                >
                  등록된 관리자가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1A1E2E] border border-[#2D3348] rounded-xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2D3348]">
              <h2 className="text-lg font-bold text-white">
                {modalMode === "create"
                  ? "관리자 계정 추가"
                  : "관리자 계정 수정"}
              </h2>
              <button
                onClick={() => setModalMode(null)}
                className="text-[#8B92A5] hover:text-white transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#8B92A5] mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, email: e.target.value }))
                    }
                    disabled={modalMode === "edit"}
                    className="w-full px-3 py-2 bg-[#0F1117] border border-[#2D3348] rounded-lg text-sm text-white placeholder:text-[#555B6E] outline-none focus:border-blue-500 disabled:opacity-50"
                    placeholder="admin@cosfit.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8B92A5] mb-1">
                    이름
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0F1117] border border-[#2D3348] rounded-lg text-sm text-white placeholder:text-[#555B6E] outline-none focus:border-blue-500"
                    placeholder="관리자 이름"
                  />
                </div>
              </div>

              {modalMode === "create" && (
                <div>
                  <label className="block text-xs font-medium text-[#8B92A5] mb-1">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, password: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0F1117] border border-[#2D3348] rounded-lg text-sm text-white placeholder:text-[#555B6E] outline-none focus:border-blue-500"
                    placeholder="8자 이상"
                  />
                </div>
              )}

              {/* Permission Matrix */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">
                  메뉴 권한 설정
                </h3>
                <div className="bg-[#0F1117] rounded-lg border border-[#2D3348] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2D3348]">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-[#555B6E]">
                          메뉴
                        </th>
                        <th className="text-center px-4 py-2.5 text-xs font-medium text-[#555B6E] w-20">
                          조회
                        </th>
                        <th className="text-center px-4 py-2.5 text-xs font-medium text-[#555B6E] w-20">
                          등록
                        </th>
                        <th className="text-center px-4 py-2.5 text-xs font-medium text-[#555B6E] w-20">
                          수정
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ADMIN_MENUS.map((menu) => {
                        const perm = form.permissions.menuPermissions[
                          menu.key
                        ] ?? { view: false, create: false, edit: false };
                        return (
                          <tr
                            key={menu.key}
                            className="border-b border-[#1E2234] hover:bg-[#1A1E2E]"
                          >
                            <td className="px-4 py-2.5 text-[#C8CDD8]">
                              {menu.label}
                            </td>
                            {(
                              ["view", "create", "edit"] as const
                            ).map((p) => (
                              <td key={p} className="text-center px-4 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={perm[p]}
                                  onChange={() =>
                                    togglePermission(menu.key, p)
                                  }
                                  className="w-4 h-4 rounded border-[#2D3348] bg-[#1A1E2E] text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Quick select buttons */}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => {
                        const mp: Record<string, MenuPermission> = {};
                        ADMIN_MENUS.forEach((m) => {
                          mp[m.key] = { view: true, create: true, edit: true };
                        });
                        return {
                          ...p,
                          permissions: { menuPermissions: mp },
                        };
                      })
                    }
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    전체 선택
                  </button>
                  <span className="text-[#2D3348]">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => {
                        const mp: Record<string, MenuPermission> = {};
                        ADMIN_MENUS.forEach((m) => {
                          mp[m.key] = {
                            view: true,
                            create: false,
                            edit: false,
                          };
                        });
                        return {
                          ...p,
                          permissions: { menuPermissions: mp },
                        };
                      })
                    }
                    className="text-xs text-[#8B92A5] hover:text-white"
                  >
                    조회만
                  </button>
                  <span className="text-[#2D3348]">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => {
                        const mp: Record<string, MenuPermission> = {};
                        ADMIN_MENUS.forEach((m) => {
                          mp[m.key] = {
                            view: false,
                            create: false,
                            edit: false,
                          };
                        });
                        return {
                          ...p,
                          permissions: { menuPermissions: mp },
                        };
                      })
                    }
                    className="text-xs text-[#8B92A5] hover:text-white"
                  >
                    전체 해제
                  </button>
                </div>
              </div>

              {/* OTP Section (info only) */}
              <div className="bg-[#0F1117] rounded-lg border border-[#2D3348] px-4 py-3">
                <h3 className="text-sm font-semibold text-white mb-1">
                  OTP 2차 인증
                </h3>
                <p className="text-xs text-[#555B6E]">
                  Google Authenticator 연동은 계정 생성 후 개별 설정할 수
                  있습니다. QR 코드를 통해 OTP 앱에 등록합니다.
                </p>
              </div>

              {/* Error in modal */}
              {error && (
                <div className="px-3 py-2 bg-red-900/30 border border-red-800 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2D3348]">
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 text-sm text-[#8B92A5] hover:text-white transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? "저장 중..." : modalMode === "create" ? "생성" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1A1E2E] border border-[#2D3348] rounded-xl w-full max-w-[400px] mx-4 p-6">
            <h3 className="text-lg font-bold text-white mb-2">
              관리자 계정 삭제
            </h3>
            <p className="text-sm text-[#8B92A5] mb-6">
              이 관리자 계정을 삭제하시겠습니까? 삭제된 계정은 일반 사용자로
              변경됩니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-[#8B92A5] hover:text-white transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1A1E2E] border border-[#2D3348] rounded-xl w-full max-w-[400px] mx-4 p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              비밀번호 초기화
            </h3>
            <input
              type="password"
              value={resetPwValue}
              onChange={(e) => setResetPwValue(e.target.value)}
              className="w-full px-3 py-2 bg-[#0F1117] border border-[#2D3348] rounded-lg text-sm text-white placeholder:text-[#555B6E] outline-none focus:border-blue-500 mb-4"
              placeholder="새 비밀번호 (8자 이상)"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setResetPwId(null)}
                className="px-4 py-2 text-sm text-[#8B92A5] hover:text-white transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetPwValue.length < 8}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Permission Summary Component ──

function PermissionSummary({
  permissions,
  isSuperAdmin,
}: {
  permissions: AdminPermissions;
  isSuperAdmin: boolean;
}) {
  if (isSuperAdmin) {
    return (
      <span className="text-xs text-purple-300">전체 권한</span>
    );
  }

  const mp = permissions?.menuPermissions ?? {};
  const viewCount = Object.values(mp).filter((p: any) => p.view).length;
  const editCount = Object.values(mp).filter((p: any) => p.edit).length;
  const total = ADMIN_MENUS.length;

  return (
    <span className="text-xs text-[#8B92A5]">
      조회 {viewCount}/{total} · 수정 {editCount}/{total}
    </span>
  );
}
