"use client";

import { useEffect, useState } from "react";
import {
  getUserStats,
  getServiceUsageStats,
  getChurnStats,
  getLongInactiveUsers,
  type UserStats,
  type ServiceUsageStats,
  type ChurnStats,
  type InactiveUser,
} from "./actions";

// ── Summary Card ──

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5">
      <div className="text-xs text-[#8B92A5] mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{typeof value === "number" ? value.toLocaleString() : value}</div>
      {sub && <div className="text-xs text-[#555B6E] mt-1">{sub}</div>}
    </div>
  );
}

// ── Bar Chart (CSS only) ──

function BarChart({ data, maxBars = 30 }: { data: { date: string; count: number }[]; maxBars?: number }) {
  const visible = data.slice(-maxBars);
  const maxVal = Math.max(...visible.map((d) => d.count), 1);

  return (
    <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5">
      <h3 className="text-sm font-semibold text-white mb-4">가입 추이 (최근 30일)</h3>
      <div className="flex items-end gap-[3px] h-[140px]">
        {visible.map((d) => {
          const h = Math.max((d.count / maxVal) * 100, 2);
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end group relative">
              <div
                className="w-full bg-blue-500 rounded-t-sm min-h-[2px] transition-all hover:bg-blue-400"
                style={{ height: `${h}%` }}
              />
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#2D3348] text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {d.date.slice(5)}: {d.count}명
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-[#555B6E]">{visible[0]?.date.slice(5)}</span>
        <span className="text-[10px] text-[#555B6E]">{visible[visible.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

// ── Progress Bar ──

function UsageBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#C8CDD8]">{label}</span>
        <span className="text-[#8B92A5]">{value.toLocaleString()}건</span>
      </div>
      <div className="w-full h-2 bg-[#2D3348] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Pie Chart (CSS) ──

function PieChart({ active, inactive }: { active: number; inactive: number }) {
  const total = active + inactive || 1;
  const activePct = Math.round((active / total) * 100);
  const inactivePct = 100 - activePct;

  return (
    <div className="flex items-center gap-6">
      <div
        className="w-24 h-24 rounded-full flex-shrink-0"
        style={{
          background: `conic-gradient(#3B82F6 0% ${activePct}%, #EF4444 ${activePct}% 100%)`,
        }}
      />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span className="text-xs text-[#C8CDD8]">활성 {activePct}% ({active.toLocaleString()}명)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span className="text-xs text-[#C8CDD8]">비활성 {inactivePct}% ({inactive.toLocaleString()}명)</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function StatisticsPage() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [usageStats, setUsageStats] = useState<ServiceUsageStats | null>(null);
  const [churnStats, setChurnStats] = useState<ChurnStats | null>(null);
  const [inactiveUsers, setInactiveUsers] = useState<InactiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [us, ss, cs, iu] = await Promise.all([
          getUserStats(),
          getServiceUsageStats(),
          getChurnStats(),
          getLongInactiveUsers(30),
        ]);
        setUserStats(us);
        setUsageStats(ss);
        setChurnStats(cs);
        setInactiveUsers(iu);
      } catch (e: any) {
        setError(e.message || "데이터 로드 실패");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-[#8B92A5] text-sm">통계 데이터를 불러오는 중...</div>
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

  const maxUsage = Math.max(
    usageStats?.compareCount ?? 0,
    usageStats?.onboardingCompleted ?? 0,
    usageStats?.orderCount ?? 0,
    usageStats?.routineAnalysisCount ?? 0,
    usageStats?.userProductCount ?? 0,
    usageStats?.reviewCount ?? 0,
    1
  );

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">📈 통계 / 보고서</h1>
        <p className="text-sm text-[#8B92A5] mt-1">플랫폼 전체 사용 현황 및 회원 분석</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="총 회원수" value={userStats?.totalUsers ?? 0} />
        <StatCard label="오늘 가입" value={userStats?.todaySignups ?? 0} />
        <StatCard label="MAU (월간 활성)" value={userStats?.monthlyActiveUsers ?? 0} />
        <StatCard label="DAU (일간 활성)" value={userStats?.todayLogins ?? 0} />
      </div>

      {/* Row 2: Signup Trend + Service Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Signup Trend Chart */}
        {userStats && <BarChart data={userStats.signupTrend} />}

        {/* Service Usage */}
        <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">서비스 이용 현황</h3>
          {usageStats && (
            <>
              <UsageBar label="비교 분석" value={usageStats.compareCount} max={maxUsage} color="bg-blue-500" />
              <UsageBar label="온보딩 완료" value={usageStats.onboardingCompleted} max={maxUsage} color="bg-emerald-500" />
              <UsageBar label="주문" value={usageStats.orderCount} max={maxUsage} color="bg-purple-500" />
              <UsageBar label="루틴 분석" value={usageStats.routineAnalysisCount} max={maxUsage} color="bg-amber-500" />
              <UsageBar label="제품 등록" value={usageStats.userProductCount} max={maxUsage} color="bg-cyan-500" />
              <UsageBar label="리뷰" value={usageStats.reviewCount} max={maxUsage} color="bg-pink-500" />
            </>
          )}
        </div>
      </div>

      {/* Row 3: Activity Pie + Churn */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* User Activity Pie */}
        <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">회원 활성 현황</h3>
          {churnStats && (
            <PieChart
              active={churnStats.totalActive}
              inactive={(userStats?.totalUsers ?? 0) - churnStats.totalActive}
            />
          )}
          {churnStats && (
            <div className="mt-4 text-xs text-[#8B92A5]">
              7일 내 재방문율: <span className="text-white font-semibold">{churnStats.retentionRate}%</span>
            </div>
          )}
        </div>

        {/* Churn Analysis */}
        <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">이탈 분석</h3>
          {churnStats && (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-[#141620]">
                <span className="text-sm text-[#C8CDD8]">7일 이상 미접속</span>
                <span className="text-lg font-bold text-amber-400">{churnStats.inactive7d.toLocaleString()}명</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-[#141620]">
                <span className="text-sm text-[#C8CDD8]">30일 이상 미접속</span>
                <span className="text-lg font-bold text-orange-400">{churnStats.inactive30d.toLocaleString()}명</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-[#141620]">
                <span className="text-sm text-[#C8CDD8]">90일 이상 미접속</span>
                <span className="text-lg font-bold text-red-400">{churnStats.inactive90d.toLocaleString()}명</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Signup Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="이번 주 가입" value={userStats?.weekSignups ?? 0} />
        <StatCard label="이번 달 가입" value={userStats?.monthSignups ?? 0} />
        <StatCard label="올해 가입" value={userStats?.yearSignups ?? 0} />
        <StatCard label="주간 활성 (WAU)" value={userStats?.weeklyActiveUsers ?? 0} />
      </div>

      {/* Row 5: Long Inactive Users Table */}
      <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden">
        <div className="p-5 border-b border-[#2D3348]">
          <h3 className="text-sm font-semibold text-white">장기 미접속 회원 (30일+)</h3>
          <p className="text-xs text-[#555B6E] mt-1">최근 30일 이상 접속하지 않은 회원 목록</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D3348]">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-[#555B6E]">이름</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-[#555B6E]">이메일</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-[#555B6E]">가입일</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-[#555B6E]">마지막 접속</th>
            </tr>
          </thead>
          <tbody>
            {inactiveUsers.map((u) => (
              <tr key={u.id} className="border-b border-[#1E2234] hover:bg-[#1E2234]">
                <td className="px-4 py-3 text-[#C8CDD8]">{u.name}</td>
                <td className="px-4 py-3 text-[#8B92A5] text-xs">{u.email}</td>
                <td className="px-4 py-3 text-[#8B92A5] text-xs">{u.createdAt}</td>
                <td className="px-4 py-3 text-[#8B92A5] text-xs">{u.lastSessionExpires ?? "접속 기록 없음"}</td>
              </tr>
            ))}
            {inactiveUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-[#555B6E]">
                  장기 미접속 회원이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
