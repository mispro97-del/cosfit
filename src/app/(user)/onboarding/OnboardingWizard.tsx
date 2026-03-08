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
        const result = await saveSkinProfile({
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
        await skipOnboarding("PRODUCTS");
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
      await registerHolyGrailProduct({
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
      await removeHolyGrailProduct(id);
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
      const result = await triggerStandardGeneration();
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
    <div className="relative overflow-hidden">
      {/* Onboarding Header */}
      {view !== "analyzing" && (
        <header className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            {(view === "products" || step > 0) && (
              <button
                onClick={handleBack}
                className="text-[#6B7280] bg-transparent border-none cursor-pointer p-1 hover:text-[#1F2937] transition-colors rounded-lg hover:bg-[#F3F4F6]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            <span className="text-lg font-extrabold tracking-tight text-[#1F2937]">
              COSFIT
            </span>
          </div>
          <span className="text-sm text-[#9CA3AF] font-medium">
            {view === "onboarding" ? `STEP ${step + 1} / 3` : "인생템 등록"}
          </span>
        </header>
      )}

      {/* Progress dots */}
      {view === "onboarding" && <ProgressDots current={step} total={3} />}

      {/* Content */}
      <div className="pt-2 pb-28" key={animKey}>
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
      </div>

      {/* Bottom action bar */}
      {view !== "analyzing" && view !== "complete" && (
        <div
          className="fixed bottom-0 z-40 px-6 pb-7 pt-3"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "440px",
            background: "linear-gradient(to top, #FFFFFF 70%, transparent)",
          }}
        >
          {view === "onboarding" && (
            <>
              <PrimaryButton onClick={handleNext} disabled={!canProceed() || isPending}>
                {isPending ? "저장 중..." : step < 2 ? "다음" : "인생템 등록하기"}
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
                : `분석 시작하기 (${registered.length}개 등록됨)`}
            </PrimaryButton>
          )}
        </div>
      )}
    </div>
  );
}
