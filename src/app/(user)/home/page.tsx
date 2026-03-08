import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardData } from "./actions";
import Link from "next/link";

function ScoreBadge({ score }: { score: number }) {
  let color = "bg-gray-100 text-gray-600";
  if (score >= 80) color = "bg-green-100 text-green-700";
  else if (score >= 60) color = "bg-yellow-100 text-yellow-700";
  else if (score >= 40) color = "bg-orange-100 text-orange-700";
  else if (score > 0) color = "bg-red-100 text-red-700";

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {score.toFixed(0)}점
    </span>
  );
}

function SkinTypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
      {label}
    </span>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  CLEANSER: "클렌저",
  TONER: "토너",
  SERUM: "세럼",
  EMULSION: "에멀전",
  CREAM: "크림",
  SUNSCREEN: "선크림",
  MASK: "마스크",
  EYE_CARE: "아이케어",
  LIP_CARE: "립케어",
  BODY_CARE: "바디케어",
  MAKEUP_BASE: "메이크업베이스",
  OTHER: "기타",
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getDashboardData();
  if (!data) redirect("/login");

  const { userName, onboardingDone, skinProfile, routine, recommendations, featuredProducts, stats } = data;

  return (
    <div className="space-y-6 pb-8 animate-fade-in-up">
      {/* Hero Section */}
      <section className="pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
              안녕하세요, {userName}님
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              나에게 딱 맞는 화장품을 찾아보세요
            </p>
          </div>
          {skinProfile && (
            <SkinTypeBadge label={skinProfile.skinTypeLabel} />
          )}
        </div>
      </section>

      {/* Onboarding CTA */}
      {!onboardingDone && (
        <Link href="/onboarding" className="block">
          <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-purple-100/50 -translate-y-6 translate-x-6" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth={2}>
                    <path d="M12 2v20M2 12h20" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                  시작하기
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900">피부 프로필 등록</h3>
              <p className="text-sm text-gray-500 mt-1">간단한 설문으로 나만의 기준을 만들어보세요</p>
            </div>
          </div>
        </Link>
      )}

      {/* My Skin Summary */}
      {skinProfile && (
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">내 피부 요약</h2>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">피부 타입</p>
                <p className="text-sm font-semibold text-gray-900">{skinProfile.skinTypeLabel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">민감도</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-4 h-2 rounded-full ${
                        level <= skinProfile.sensitivityLevel
                          ? "bg-purple-500"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">{skinProfile.sensitivityLevel}/5</span>
                </div>
              </div>
            </div>
            {skinProfile.skinConcerns.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-2">피부 고민</p>
                <div className="flex flex-wrap gap-1.5">
                  {skinProfile.skinConcerns.map((concern) => (
                    <span
                      key={concern}
                      className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium"
                    >
                      {concern}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {skinProfile.allergies.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-2">알러지 성분</p>
                <div className="flex flex-wrap gap-1.5">
                  {skinProfile.allergies.map((allergy) => (
                    <span
                      key={allergy}
                      className="px-2.5 py-1 bg-red-50 text-red-500 text-xs rounded-full font-medium"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Routine Status */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">루틴 현황</h2>
          <Link href="/routine" className="text-xs font-medium text-purple-600 hover:underline">
            관리하기
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Morning */}
          <Link href="/routine" className="block">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">&#9728;&#65039;</span>
                <span className="text-sm font-bold text-gray-900">모닝 루틴</span>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">
                {routine.morningCount}
                <span className="text-xs font-normal text-gray-400 ml-1">제품</span>
              </p>
              {routine.latestAnalysis && routine.latestAnalysis.routineType === "MORNING" && (
                <div className="mt-2">
                  <ScoreBadge score={routine.latestAnalysis.score} />
                </div>
              )}
            </div>
          </Link>

          {/* Evening */}
          <Link href="/routine" className="block">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">&#127769;</span>
                <span className="text-sm font-bold text-gray-900">이브닝 루틴</span>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">
                {routine.eveningCount}
                <span className="text-xs font-normal text-gray-400 ml-1">제품</span>
              </p>
              {routine.latestAnalysis && routine.latestAnalysis.routineType === "EVENING" && (
                <div className="mt-2">
                  <ScoreBadge score={routine.latestAnalysis.score} />
                </div>
              )}
            </div>
          </Link>
        </div>
      </section>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">맞춤 추천</h2>
            <Link href="/recommendations" className="text-xs font-medium text-purple-600 hover:underline">
              전체보기
            </Link>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <Link
                key={rec.id}
                href={`/shop/${rec.product.id}`}
                className="block"
              >
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                  {/* Image placeholder */}
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {rec.product.imageUrl ? (
                      <img
                        src={rec.product.imageUrl}
                        alt={rec.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth={1.5}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{rec.product.brandName}</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{rec.product.name}</p>
                    <p className="text-xs text-gray-500 mt-1 truncate">{rec.reason}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <ScoreBadge score={rec.fitScore} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Partner Products */}
      {featuredProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">추천 제품</h2>
            <Link href="/shop" className="text-xs font-medium text-purple-600 hover:underline">
              더보기
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featuredProducts.map((product) => (
              <Link
                key={product.partnerProductId}
                href={`/shop/${product.productId}`}
                className="block"
              >
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Image */}
                  <div className="aspect-square bg-gray-50 flex items-center justify-center">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth={1.5}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-400">{product.brandName}</p>
                    <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">
                      {product.name}
                    </p>
                    {product.price !== null && (
                      <div className="mt-2 flex items-center gap-1.5">
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-xs text-gray-400 line-through">
                            {product.originalPrice.toLocaleString()}원
                          </span>
                        )}
                        <span className="text-sm font-bold text-gray-900">
                          {product.price.toLocaleString()}원
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {CATEGORY_LABEL[product.category] || product.category}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="text-base font-bold text-gray-900 mb-3">빠른 시작</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link href="/compare" className="block">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M2 12h20" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-700">제품 등록</p>
            </div>
          </Link>

          <Link href="/compare" className="block">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-700">루틴 분석</p>
            </div>
          </Link>

          <Link href="/compare" className="block">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-700">성분 사전</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section>
        <div className="rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">내 활동</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{stats.totalProducts}</p>
              <p className="text-xs text-gray-500">등록 제품</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{stats.analysisCount}</p>
              <p className="text-xs text-gray-500">분석 횟수</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
