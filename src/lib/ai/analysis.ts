// COSFIT - AI Analysis Service
// User Standard 생성 및 FIT Score 계산

import type {
  UserStandardData,
  FitScoreResult,
  FitGrade,
  PreferredIngredient,
  AvoidIngredient,
} from "@/types";

export async function generateUserStandard(
  holyGrailProducts: {
    ingredients: { nameInci: string; nameKo?: string; orderIndex: number }[];
    category: string;
    satisfactionScore: number;
  }[]
): Promise<UserStandardData> {
  const ingredientFrequency = new Map<string, number>();
  const ingredientPositions = new Map<string, number[]>();

  for (const product of holyGrailProducts) {
    for (const ing of product.ingredients) {
      const key = ing.nameInci.toLowerCase();
      ingredientFrequency.set(key, (ingredientFrequency.get(key) || 0) + 1);
      if (!ingredientPositions.has(key)) ingredientPositions.set(key, []);
      ingredientPositions.get(key)!.push(ing.orderIndex);
    }
  }

  const preferredIngredients: PreferredIngredient[] = [];
  const totalProducts = holyGrailProducts.length;

  for (const [ingredient, freq] of ingredientFrequency) {
    if (freq >= 2) {
      const positions = ingredientPositions.get(ingredient)!;
      const avgPosition = positions.reduce((a, b) => a + b, 0) / positions.length;
      const weight = (freq / totalProducts) * (1 / (1 + avgPosition * 0.1));

      preferredIngredients.push({
        ingredient,
        weight: Math.round(weight * 100) / 100,
        reason: `${freq}/${totalProducts}개 인생템에 공통 포함 (평균 순위: ${Math.round(avgPosition)})`,
      });
    }
  }

  preferredIngredients.sort((a, b) => b.weight - a.weight);

  const avoidIngredients: AvoidIngredient[] = [];

  return {
    preferredIngredients: preferredIngredients.slice(0, 20),
    avoidIngredients,
    ingredientPatterns: [],
  };
}

export async function calculateFitScore(
  standard: UserStandardData,
  productIngredients: { nameInci: string; orderIndex: number }[]
): Promise<FitScoreResult> {
  const productSet = new Set(productIngredients.map((i) => i.nameInci.toLowerCase()));

  let matchScore = 0;
  let totalWeight = 0;
  const matchedGood = [];
  const missingPreferred = [];

  for (const pref of standard.preferredIngredients) {
    totalWeight += pref.weight;
    if (productSet.has(pref.ingredient.toLowerCase())) {
      matchScore += pref.weight;
      matchedGood.push({ ingredient: pref.ingredient, reason: pref.reason, impact: pref.weight });
    } else if (pref.weight > 0.3) {
      missingPreferred.push({
        ingredient: pref.ingredient,
        importance: pref.weight > 0.6 ? "HIGH" as const : "MEDIUM" as const,
      });
    }
  }

  let riskPenalty = 0;
  const matchedRisk = [];

  for (const avoid of standard.avoidIngredients) {
    if (productSet.has(avoid.ingredient.toLowerCase())) {
      const penalty = avoid.riskLevel === "HIGH" ? 25 : avoid.riskLevel === "MEDIUM" ? 15 : 5;
      riskPenalty += penalty;
      matchedRisk.push({ ingredient: avoid.ingredient, riskLevel: avoid.riskLevel, reason: avoid.reason });
    }
  }

  const baseScore = totalWeight > 0 ? (matchScore / totalWeight) * 100 : 50;
  const finalScore = Math.max(0, Math.min(100, Math.round(baseScore - riskPenalty)));
  const grade = scoreToGrade(finalScore);

  return {
    score: finalScore,
    grade,
    matchedGood,
    matchedRisk,
    missingPreferred,
    summary: `FIT Score ${finalScore}점 (${grade}). 선호 성분 ${matchedGood.length}개 매칭, 주의 성분 ${matchedRisk.length}개 감지.`,
  };
}

function scoreToGrade(score: number): FitGrade {
  if (score >= 85) return "PERFECT";
  if (score >= 70) return "GOOD";
  if (score >= 50) return "FAIR";
  if (score >= 30) return "POOR";
  return "RISK";
}
