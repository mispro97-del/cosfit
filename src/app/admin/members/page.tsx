"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getMemberDashboard,
  getMembers,
  type MemberDashboard,
  type MemberListItem,
} from "./actions";

// ── Onboarding Status Labels ──

const ONBOARDING_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: "대기", bg: "bg-gray-800/50", text: "text-gray-400" },
  SKIN_PROFILED: { label: "피부분석", bg: "bg-blue-900/30", text: "text-blue-400" },
  PRODUCTS_ADDED: { label: "제품등록", bg: "bg-purple-900/30", text: "text-purple-400" },
  STANDARD_READY: { label: "기준생성", bg: "bg-amber-900/30", text: "text-amber-400" },
  COMPLETED: { label: "완료", bg: "bg-emerald-900/30", text: "text-emerald-400" },
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5">
      <div className="text-xs text-[#8B92A5] mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
    </div>
  );
}

export default function MembersPage() {
  const [dashboard, setDashboard] = useState<MemberDashboard | null>(null);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [onboardingFilter, setOnboardingFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async (p: number, s: string, f: string) => {
    try {
      const result = await getMembers(p, s, f);
      setMembers(result.members);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const [dash] = await Promise.all([
          getMemberDashboard(),
          loadMembers(1, "", "ALL"),
        ]);
        setDashboard(dash);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadMembers]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
    loadMembers(1, searchInput, onboardingFilter);
  };

  const handleFilterChange = (f: string) => {
    setOnboardingFilter(f);
    setPage(1);
    loadMembers(1, search, f);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    loadMembers(p, search, onboardingFilter);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-[#8B92A5] text-sm">회원 데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">👥 회원 관리</h1>
        <p className="text-sm text-[#8B92A5] mt-1">플랫폼 회원 조회 및 관리</p>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard label="오늘 가입" value={dashboard.todaySignups} />
          <StatCard label="이번 달 가입" value={dashboard.monthSignups} />
          <StatCard label="올해 가입" value={dashboard.yearSignups} />
          <StatCard label="총 회원수" value={dashboard.totalMembers} />
          <StatCard label="활성 회원 (30일)" value={dashboard.activeMembers} />
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2 flex-1">
          <input
            type="text"
            placeholder="이름 또는 이메일 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-3 py-2 bg-[#1A1E2E] border border-[#2D3348] rounded-lg text-sm text-white placeholder:text-[#555B6E] outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            검색
          </button>
        </div>
        <select
          value={onboardingFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="px-3 py-2 bg-[#1A1E2E] border border-[#2D3348] rounded-lg text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="ALL">전체 상태</option>
          <option value="PENDING">대기</option>
          <option value="SKIN_PROFILED">피부분석</option>
          <option value="PRODUCTS_ADDED">제품등록</option>
          <option value="STANDARD_READY">기준생성</option>
          <option value="COMPLETED">완료</option>
        </select>
      </div>

      {/* Total Count */}
      <div className="text-xs text-[#8B92A5] mb-3">총 {total.toLocaleString()}명</div>

      {/* Member Table */}
      <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D3348]">
              {["이름", "이메일", "가입일", "마지막 접속", "온보딩 상태", ""].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-[#555B6E]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const ob = ONBOARDING_LABELS[m.onboardingStatus] ?? ONBOARDING_LABELS.PENDING;
              return (
                <tr key={m.id} className="border-b border-[#1E2234] hover:bg-[#1E2234]">
                  <td className="px-4 py-3 text-[#C8CDD8] font-medium">{m.name ?? "미설정"}</td>
                  <td className="px-4 py-3 text-[#8B92A5] text-xs">{m.email}</td>
                  <td className="px-4 py-3 text-[#8B92A5] text-xs">{m.createdAt}</td>
                  <td className="px-4 py-3 text-[#8B92A5] text-xs">{m.lastLoginAt ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${ob.bg} ${ob.text}`}>
                      {ob.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/members/${m.id}`}
                      className="text-xs text-blue-400 hover:text-blue-300 no-underline"
                    >
                      상세보기
                    </Link>
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#555B6E]">
                  검색 결과가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#1A1E2E] border border-[#2D3348] text-[#8B92A5] hover:bg-[#2D3348] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            const startPage = Math.max(1, Math.min(page - 4, totalPages - 9));
            const p = startPage + i;
            if (p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  p === page
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-[#1A1E2E] border-[#2D3348] text-[#8B92A5] hover:bg-[#2D3348]"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#1A1E2E] border border-[#2D3348] text-[#8B92A5] hover:bg-[#2D3348] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
