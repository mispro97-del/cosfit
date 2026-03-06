import { z } from "zod";

export const skinProfileSchema = z.object({
  skinType: z.enum(["DRY", "OILY", "COMBINATION", "SENSITIVE", "NORMAL"]),
  skinConcerns: z.array(z.string()).min(1, "최소 1개의 피부 고민을 선택해주세요."),
  allergies: z.array(z.string()).default([]),
  ageGroup: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  sensitivityLevel: z.number().min(1).max(5).default(3),
});

export const holyGrailProductSchema = z.object({
  productId: z.string().optional(),
  customName: z.string().min(1).max(200).optional(),
  customBrand: z.string().max(100).optional(),
  category: z.enum([
    "CLEANSER", "TONER", "SERUM", "EMULSION", "CREAM",
    "SUNSCREEN", "MASK", "EYE_CARE", "LIP_CARE", "BODY_CARE",
    "MAKEUP_BASE", "OTHER",
  ]),
  usagePeriod: z.string().optional(),
  satisfactionScore: z.number().min(1).max(5).default(5),
  memo: z.string().max(500).optional(),
  manualIngredients: z.array(z.string()).default([]),
});

export const registerHolyGrailsSchema = z.object({
  products: z.array(holyGrailProductSchema).min(2).max(5),
});

export const compareRequestSchema = z.object({
  productId: z.string().min(1),
});

export const productSearchSchema = z.object({
  query: z.string().min(1).max(100),
  category: z.string().optional(),
  brand: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
});

export const partnerProductSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string(),
  description: z.string().max(2000).optional(),
  volume: z.string().optional(),
  price: z.number().min(0).optional(),
  ingredients: z.array(z.object({
    nameInci: z.string(),
    nameKo: z.string().optional(),
    orderIndex: z.number(),
  })),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().min(1).max(5),
  content: z.string().min(10).max(2000),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
});

export const dataSyncRequestSchema = z.object({
  source: z.enum(["KFDA_API", "EWG_SCRAPER", "COSDNA"]),
  syncType: z.enum(["FULL", "INCREMENTAL"]).default("INCREMENTAL"),
});

export type SkinProfileInput = z.infer<typeof skinProfileSchema>;
export type HolyGrailProductInput = z.infer<typeof holyGrailProductSchema>;
export type CompareRequestInput = z.infer<typeof compareRequestSchema>;
export type ProductSearchInput = z.infer<typeof productSearchSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
