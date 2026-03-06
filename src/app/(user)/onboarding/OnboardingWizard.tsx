// ============================================================
// COSFIT - Onboarding Wizard Client Component
// 전체 온보딩 플로우 오케스트레이터
// ============================================================

"use client";

import { useState, useCallback, useTransition } from "react";
import { SkinTypeStep } from "./steps/SkinTypeStep";
import { SkinConcernsStep } from "./steps/SkinConcernsStep";
import { SensitivityStep } from "./steps/SensitivityStep";
import { ProductSearchStep } from "./steps/ProductSearchStep";
import { AnalyzingScreen } from "./steps/AnalyzingScreen";
import { CompletionScreen } from "./steps/CompletionScreen";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SkipButton } from "@/components/ui/SkipButton";
import {
  saveSkinProfile,
  registerHolyGrailProduct,
  removeHolyGrailProduct,
  triggerStandardGeneration,
  skipOnboarding,
} from "./actions";

// ── Types ──
type View = "onboarding" | "products" | "analyzing" | "complete";

interface SkinProfile {
  skinType: string | null;
  skinConcerns: string[];
  sensitivityLevel: number | null;
}

interface RegisteredProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
}

interface StandardResult {
  standardId: string;
  confidence: number;
}

export function OnboardingWizard() {
  // ── State ──
  const [view, setView] = useState<View>("onboarding");
  const [step, setStep] = useState(0);
  const [skinProfile, setSkinProfile] = useState<SkinProfile>({
    skinType: null,
    skinConcerns: [],
    sensitivityLevel: null,
  });
  const [registered, setRegistered] = useState<RegisteredProduct[]>([]);
  const [standardResult, setStandardResult] = useState<StandardResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Animation key for transitions
  const [animKey, setAnimKey] = useState(0);
  const nextAnim = () => setAnimKey((k) => k + 1);

  // ── Validation ──
  const canProceed = (): boolean => {
    if (step === 0) return !!skinProfile.skinType;
    if (step === 1) return skinProfile.skinConcerns.length > 0;
    if (step === 2) return skinProfile.sensitivityLevel !== null;
    return false;
  };

  // ── Handlers ──
  const handleNext = useCallback(() => {
    if (step < 2) {
      setStep((s) => s + 1);
      nextAnim();
    } else {
      // 피부 프로필 저장 후 인생템 등록으로 이동
      startTransition(async () => {
        const result = await saveSkinProfile("current-user-id", {
          skinType: skinProfile.skinType as any,
          skinConcerns: skinProfile.skinConcerns,
          sensitivityLevel: skinProfile.sensitivityLevel!,
        });
        if (result.success) {
          setView("products");
          nextAnim();
        }
      });
    }
  }, [step, skinProfile]);

  const handleSkip = useCallback(() => {
    if (step < 2) {
      setStep((s) => s + 1);
      nextAnim();
    } else {
      startTransition(async () => {
        await skipOnboarding("current-user-id", "PRODUCTS");
        setView("products");
        nextAnim();
      });
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (view === "products") {
      setView("onboarding");
      setStep(2);
    } else if (step > 0) {
      setStep((s) => s - 1);
    }
    nextAnim();
  }, [view, step]);

  const handleRegister = useCallback((product: RegisteredProduct) => {
    if (registered.length >= 5) return;
    if (registered.some((r) => r.id === product.id)) return;
    setRegistered((prev) => [...prev, product]);

    startTransition(async () => {
      await registerHolyGrailProduct("current-user-id", {
        productId: product.id,
        customName: product.name,
        customBrand: product.brand,
        category: product.category,
      });
    });
  }, [registered]);

  const handleRemove = useCallback((id: string) => {
    setRegistered((prev) => prev.filter((p) => p.id !== id));
    startTransition(async () => {
      await removeHolyGrailProduct("current-user-id", id);
    });
  }, []);

  const handleStartAnalysis = useCallback(() => {
    if (registered.length >= 2) {
      setView("analyzing");
      nextAnim();
    }
  }, [registered]);

  const handleAnalysisComplete = useCallback(() => {
    startTransition(async () => {
      const result = await triggerStandardGeneration("current-user-id");
      if (result.success && result.data) {
        setStandardResult(result.data);
      }
      setView("complete");
      nextAnim();
    });
  }, []);

  const updateProfile = useCallback((update: Partial<SkinProfile>) => {
    setSkinProfile((prev) => ({ ...prev, ...update }));
  }, []);

  // ── Render ──
  return (
    <div className="max-w-[440px] mx-auto min-h-screen bg-[#FDFBF9] relative overflow-hidden">
      {/* Header */}
      {view !== "analyzing" && (
        <header className="sticky top-0 z-50 px-5 py-4 bg-[#FDFBF9]/90 backdrop-blur-xl border-b border-[#EDE6DF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(view === "products" || step > 0) && (
              <button
                onClick={handleBack}
                className="text-xl text-[#8B7E76] bg-transparent border-none cursor-pointer px-2 py-1 hover:text-[#2D2420] transition-colors"
              >
                ←
              </button>
            )}
            <span className="text-xl font-extrabold tracking-tight text-[#2D2420]">
              COSFIT
            </span>
          </div>
          <span className="text-sm text-[#B5AAA2]">
            {view === "onboarding" ? `STEP ${step + 1} / 3` : "인생템 등록"}
          </span>
        </header>
      )}

      {/* Progress dots */}
      {view === "onboarding" && <ProgressDots current={step} total={3} />}

      {/* Content */}
      <main className="px-6 pt-2 pb-28" key={animKey}>
        {view === "onboarding" && step === 0 && (
          <SkinTypeStep value={skinProfile.skinType} onChange={(v) => updateProfile({ skinType: v })} />
        )}
        {view === "onboarding" && step === 1 && (
          <SkinConcernsStep value={skinProfile.skinConcerns} onChange={(v) => updateProfile({ skinConcerns: v })} />
        )}
        {view === "onboarding" && step === 2 && (
          <SensitivityStep value={skinProfile.sensitivityLevel} onChange={(v) => updateProfile({ sensitivityLevel: v })} />
        )}
        {view === "products" && (
          <ProductSearchStep
            registered={registered}
            onRegister={handleRegister}
            onRemove={handleRemove}
          />
        )}
        {view === "analyzing" && (
          <AnalyzingScreen onComplete={handleAnalysisComplete} />
        )}
        {view === "complete" && (
          <CompletionScreen
            registeredCount={registered.length}
            standardResult={standardResult}
          />
        )}
      </main>

      {/* Bottom action bar */}
      {view !== "analyzing" && view !== "complete" && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-6 pb-7 pt-3 bg-gradient-to-t from-[#FDFBF9] via-[#FDFBF9] to-transparent z-40">
          {view === "onboarding" && (
            <>
              <PrimaryButton onClick={handleNext} disabled={!canProceed() || isPending}>
                {isPending ? "저장 중..." : step < 2 ? "다음" : "인생템 등록하기 →"}
              </PrimaryButton>
              <div className="text-center mt-1">
                <SkipButton onClick={handleSkip} />
              </div>
            </>
          )}
          {view === "products" && (
            <PrimaryButton onClick={handleStartAnalysis} disabled={registered.length < 2}>
              {registered.length < 2
                ? `${2 - registered.length}개 더 등록해주세요`
                : `분석 시작하기 (${registered.length}개 등록됨) →`}
            </PrimaryButton>
          )}
        </div>
      )}
    </div>
  );
}
