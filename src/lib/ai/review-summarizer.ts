// ============================================================
// COSFIT - AI Review Summarizer
// Anthropic Claude API를 사용한 리뷰 AI 요약/감성분석/키워드 추출
// ============================================================

import claude from "@/lib/claude";

export interface ReviewSummaryResult {
  aiSummary: string;
  aiSentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  aiKeywords: string[];
}

export async function summarizeReview(review: {
  content: string;
  rating: number;
  pros: string[];
  cons: string[];
  productName: string;
}): Promise<ReviewSummaryResult> {
  const prompt = `다음은 화장품 리뷰입니다. 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.

제품명: ${review.productName}
별점: ${review.rating}/5
장점: ${review.pros.length > 0 ? review.pros.join(", ") : "없음"}
단점: ${review.cons.length > 0 ? review.cons.join(", ") : "없음"}
리뷰 내용: ${review.content}

응답 JSON 형식:
{
  "summary": "리뷰 핵심 내용을 50자 이내로 요약",
  "sentiment": "POSITIVE | NEGATIVE | NEUTRAL | MIXED 중 하나",
  "keywords": ["핵심 키워드 최대 5개"]
}`;

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const raw =
    response.content[0]?.type === "text" ? response.content[0].text : "{}";
  const jsonStr = raw.replace(/```json\s*|```\s*/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  const sentiment = ["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"].includes(
    parsed.sentiment
  )
    ? (parsed.sentiment as ReviewSummaryResult["aiSentiment"])
    : "NEUTRAL";

  return {
    aiSummary: parsed.summary ?? "",
    aiSentiment: sentiment,
    aiKeywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.slice(0, 5)
      : [],
  };
}
