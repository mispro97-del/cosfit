// ============================================================
// COSFIT - AI Review Summarizer
// OpenAI GPT-4o-mini를 사용한 리뷰 AI 요약/감성분석/키워드 추출
// ============================================================

import openai from "@/lib/openai";

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
  const prompt = `다음은 화장품 리뷰입니다. 아래 JSON 형식으로만 응답하세요.

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

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "당신은 화장품 리뷰를 분석하는 전문가입니다. 요청된 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  const sentiment = ["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"].includes(
    parsed.sentiment
  )
    ? (parsed.sentiment as ReviewSummaryResult["aiSentiment"])
    : "NEUTRAL";

  return {
    aiSummary: parsed.summary ?? "",
    aiSentiment: sentiment,
    aiKeywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
  };
}
