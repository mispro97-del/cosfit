// ============================================================
// COSFIT - Database Seed Script
// 실제 한국 인기 뷰티 제품 샘플 데이터
// Usage: npx ts-node prisma/seed.ts
//        or: npx prisma db seed
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding COSFIT database...");

  // ── 1. Brands ──
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { name: "에스트라" },
      update: {},
      create: { name: "에스트라", nameKo: "에스트라", country: "KR" },
    }),
    prisma.brand.upsert({
      where: { name: "토리든" },
      update: {},
      create: { name: "토리든", nameKo: "토리든", country: "KR" },
    }),
    prisma.brand.upsert({
      where: { name: "구달" },
      update: {},
      create: { name: "구달", nameKo: "구달", country: "KR" },
    }),
    prisma.brand.upsert({
      where: { name: "COSRX" },
      update: {},
      create: { name: "COSRX", nameKo: "코스알엑스", country: "KR" },
    }),
    prisma.brand.upsert({
      where: { name: "넘버즈인" },
      update: {},
      create: { name: "넘버즈인", nameKo: "넘버즈인", country: "KR" },
    }),
    prisma.brand.upsert({
      where: { name: "아이소이" },
      update: {},
      create: { name: "아이소이", nameKo: "아이소이", country: "KR" },
    }),
    prisma.brand.upsert({
      where: { name: "닥터지" },
      update: {},
      create: { name: "닥터지", nameKo: "닥터지", country: "KR" },
    }),
    prisma.brand.upsert({
      where: { name: "바이오더마" },
      update: {},
      create: { name: "바이오더마", nameKo: "바이오더마", country: "FR" },
    }),
    prisma.brand.upsert({
      where: { name: "세타필" },
      update: {},
      create: { name: "세타필", nameKo: "세타필", country: "US" },
    }),
    prisma.brand.upsert({
      where: { name: "라로슈포제" },
      update: {},
      create: { name: "라로슈포제", nameKo: "라로슈포제", country: "FR" },
    }),
  ]);

  const brandMap = Object.fromEntries(brands.map((b) => [b.name, b]));
  console.log(`✅ ${brands.length} brands created`);

  // ── 2. Ingredients ──
  const ingredientData = [
    { nameInci: "Water", nameKo: "정제수", category: "Solvent", safetyGrade: "SAFE" as const, functions: ["Solvent"], ewgScore: 1 },
    { nameInci: "Glycerin", nameKo: "글리세린", category: "Humectant", safetyGrade: "SAFE" as const, functions: ["Humectant", "Skin Conditioning"], ewgScore: 1 },
    { nameInci: "Niacinamide", nameKo: "나이아신아마이드", category: "Vitamin", safetyGrade: "SAFE" as const, functions: ["Brightening", "Pore Minimizing", "Anti-inflammatory"], ewgScore: 1 },
    { nameInci: "Hyaluronic Acid", nameKo: "히알루론산", category: "Humectant", safetyGrade: "SAFE" as const, functions: ["Humectant", "Skin Conditioning"], ewgScore: 1 },
    { nameInci: "Panthenol", nameKo: "판테놀", category: "Vitamin", safetyGrade: "SAFE" as const, functions: ["Skin Conditioning", "Humectant", "Anti-inflammatory"], ewgScore: 1 },
    { nameInci: "Centella Asiatica Extract", nameKo: "센텔라아시아티카추출물", category: "Botanical", safetyGrade: "SAFE" as const, functions: ["Soothing", "Anti-inflammatory", "Healing"], ewgScore: 1 },
    { nameInci: "Ceramide NP", nameKo: "세라마이드NP", category: "Lipid", safetyGrade: "SAFE" as const, functions: ["Skin Barrier", "Emollient"], ewgScore: 2 },
    { nameInci: "Adenosine", nameKo: "아데노신", category: "Anti-aging", safetyGrade: "SAFE" as const, functions: ["Anti-wrinkle", "Skin Conditioning"], ewgScore: 1 },
    { nameInci: "Allantoin", nameKo: "알란토인", category: "Soothing", safetyGrade: "SAFE" as const, functions: ["Soothing", "Skin Conditioning"], ewgScore: 1 },
    { nameInci: "Sodium Hyaluronate", nameKo: "히알루론산나트륨", category: "Humectant", safetyGrade: "SAFE" as const, functions: ["Humectant", "Skin Conditioning"], ewgScore: 1 },
    { nameInci: "Beta-Glucan", nameKo: "베타글루칸", category: "Humectant", safetyGrade: "SAFE" as const, functions: ["Humectant", "Immunostimulating", "Soothing"], ewgScore: 1 },
    { nameInci: "Madecassoside", nameKo: "마데카소사이드", category: "Botanical", safetyGrade: "SAFE" as const, functions: ["Soothing", "Anti-inflammatory", "Healing"], ewgScore: 1 },
    { nameInci: "Ascorbic Acid", nameKo: "아스코르빅애씨드", category: "Vitamin", safetyGrade: "SAFE" as const, functions: ["Antioxidant", "Brightening"], ewgScore: 1 },
    { nameInci: "Retinol", nameKo: "레티놀", category: "Vitamin", safetyGrade: "MODERATE" as const, functions: ["Anti-aging", "Cell Turnover"], ewgScore: 7, commonAllergen: false },
    { nameInci: "Salicylic Acid", nameKo: "살리실산", category: "Exfoliant", safetyGrade: "MODERATE" as const, functions: ["Exfoliant", "Anti-acne"], ewgScore: 5 },
    { nameInci: "Ethanol", nameKo: "에탄올", category: "Solvent", safetyGrade: "CAUTION" as const, functions: ["Solvent", "Antimicrobial"], ewgScore: 4 },
    { nameInci: "Fragrance", nameKo: "향료", category: "Fragrance", safetyGrade: "CAUTION" as const, functions: ["Fragrance"], ewgScore: 8, commonAllergen: true },
    { nameInci: "Methylparaben", nameKo: "메틸파라벤", category: "Preservative", safetyGrade: "CAUTION" as const, functions: ["Preservative"], ewgScore: 4 },
    { nameInci: "Dimethicone", nameKo: "디메치콘", category: "Emollient", safetyGrade: "SAFE" as const, functions: ["Emollient", "Skin Protectant"], ewgScore: 2 },
    { nameInci: "Propanediol", nameKo: "프로판다이올", category: "Humectant", safetyGrade: "SAFE" as const, functions: ["Humectant", "Solvent"], ewgScore: 1 },
    { nameInci: "Butylene Glycol", nameKo: "부틸렌글라이콜", category: "Humectant", safetyGrade: "SAFE" as const, functions: ["Humectant", "Solvent"], ewgScore: 1 },
    { nameInci: "Xylitylglucoside", nameKo: "자일리틸글루코사이드", category: "Humectant", safetyGrade: "SAFE" as const, functions: ["Humectant", "Skin Conditioning"], ewgScore: 1 },
    { nameInci: "Anhydroxylitol", nameKo: "무수자일리톨", category: "Humectant", safetyGrade: "SAFE" as const, functions: ["Humectant"], ewgScore: 1 },
    { nameInci: "Xylitol", nameKo: "자일리톨", category: "Humectant", safetyGrade: "SAFE" as const, functions: ["Humectant"], ewgScore: 1 },
    { nameInci: "Snail Secretion Filtrate", nameKo: "달팽이분비물여과물", category: "Biological", safetyGrade: "SAFE" as const, functions: ["Skin Conditioning", "Repair", "Humectant"], ewgScore: 2 },
    { nameInci: "Glutathione", nameKo: "글루타치온", category: "Antioxidant", safetyGrade: "SAFE" as const, functions: ["Antioxidant", "Brightening"], ewgScore: 1 },
    { nameInci: "Vitamin C (3-O-Ethyl Ascorbic Acid)", nameKo: "에칠아스코빌에텔", category: "Vitamin", safetyGrade: "SAFE" as const, functions: ["Brightening", "Antioxidant"], ewgScore: 1 },
    { nameInci: "Titanium Dioxide", nameKo: "이산화티탄", category: "UV Filter", safetyGrade: "SAFE" as const, functions: ["UV Filter", "Opacifying"], ewgScore: 2 },
    { nameInci: "Zinc Oxide", nameKo: "산화아연", category: "UV Filter", safetyGrade: "SAFE" as const, functions: ["UV Filter", "Skin Protectant"], ewgScore: 2 },
    { nameInci: "Caprylic/Capric Triglyceride", nameKo: "카프릴릭/카프릭트라이글리세라이드", category: "Emollient", safetyGrade: "SAFE" as const, functions: ["Emollient", "Skin Conditioning"], ewgScore: 1 },
  ];

  const ingredients = await Promise.all(
    ingredientData.map((ing) =>
      prisma.ingredient.upsert({
        where: { nameInci: ing.nameInci },
        update: {},
        create: {
          nameInci: ing.nameInci,
          nameKo: ing.nameKo,
          category: ing.category,
          safetyGrade: ing.safetyGrade,
          function: ing.functions,
          ewgScore: ing.ewgScore ?? null,
          commonAllergen: ing.commonAllergen ?? false,
        },
      })
    )
  );

  const ingMap = Object.fromEntries(ingredients.map((i) => [i.nameInci, i]));
  console.log(`✅ ${ingredients.length} ingredients created`);

  // ── 3. Products with Ingredients ──
  const products = [
    {
      name: "아토베리어 365 크림",
      brand: "에스트라",
      category: "CREAM" as const,
      price: 29000,
      stock: 100,
      status: "ACTIVE" as const,
      description: "피부 장벽 강화 및 보습을 위한 크림",
      ingredients: [
        "Water", "Glycerin", "Ceramide NP", "Panthenol", "Allantoin",
        "Sodium Hyaluronate", "Butylene Glycol", "Dimethicone",
        "Caprylic/Capric Triglyceride", "Niacinamide",
      ],
    },
    {
      name: "다이브인 세럼",
      brand: "토리든",
      category: "SERUM" as const,
      price: 25000,
      stock: 150,
      status: "ACTIVE" as const,
      description: "4중 히알루론산 고보습 세럼",
      ingredients: [
        "Water", "Sodium Hyaluronate", "Hyaluronic Acid", "Beta-Glucan",
        "Glycerin", "Panthenol", "Allantoin", "Xylitylglucoside",
        "Anhydroxylitol", "Xylitol",
      ],
    },
    {
      name: "맑은 비타C 잡티 세럼",
      brand: "구달",
      category: "SERUM" as const,
      price: 18000,
      stock: 120,
      status: "ACTIVE" as const,
      description: "비타민C 5% 함유 브라이트닝 세럼",
      ingredients: [
        "Water", "Ascorbic Acid", "Glycerin", "Niacinamide",
        "Vitamin C (3-O-Ethyl Ascorbic Acid)", "Hyaluronic Acid",
        "Panthenol", "Centella Asiatica Extract", "Butylene Glycol", "Adenosine",
      ],
    },
    {
      name: "스네일 뮤신 92% 에센스",
      brand: "COSRX",
      category: "SERUM" as const,
      price: 22000,
      stock: 200,
      status: "ACTIVE" as const,
      description: "달팽이 뮤신 92% 고함량 에센스",
      ingredients: [
        "Snail Secretion Filtrate", "Water", "Sodium Hyaluronate",
        "Glycerin", "Allantoin", "Panthenol", "Beta-Glucan",
        "Butylene Glycol", "Adenosine", "Niacinamide",
      ],
    },
    {
      name: "3번 글루타치온 트리플 화이트닝 세럼",
      brand: "넘버즈인",
      category: "SERUM" as const,
      price: 35000,
      stock: 80,
      status: "ACTIVE" as const,
      description: "글루타치온 함유 미백 세럼",
      ingredients: [
        "Water", "Glutathione", "Niacinamide", "Glycerin",
        "Ascorbic Acid", "Sodium Hyaluronate", "Propanediol",
        "Butylene Glycol", "Panthenol", "Adenosine",
      ],
    },
    {
      name: "불가사리 시카 크림",
      brand: "아이소이",
      category: "CREAM" as const,
      price: 28000,
      stock: 90,
      status: "ACTIVE" as const,
      description: "센텔라 성분의 진정 크림",
      ingredients: [
        "Water", "Centella Asiatica Extract", "Madecassoside", "Glycerin",
        "Ceramide NP", "Allantoin", "Panthenol", "Sodium Hyaluronate",
        "Butylene Glycol", "Adenosine",
      ],
    },
    {
      name: "레드 블레미쉬 클리어 수딩 크림",
      brand: "닥터지",
      category: "CREAM" as const,
      price: 20000,
      stock: 110,
      status: "ACTIVE" as const,
      description: "트러블 진정 수딩 크림",
      ingredients: [
        "Water", "Centella Asiatica Extract", "Madecassoside", "Allantoin",
        "Glycerin", "Niacinamide", "Ceramide NP", "Beta-Glucan",
        "Propanediol", "Adenosine",
      ],
    },
    {
      name: "센시비오 H2O 클렌징 워터",
      brand: "바이오더마",
      category: "CLEANSER" as const,
      price: 32000,
      stock: 130,
      status: "ACTIVE" as const,
      description: "민감성 피부를 위한 클렌징 워터",
      ingredients: [
        "Water", "Glycerin", "Propanediol", "Allantoin",
        "Sodium Hyaluronate", "Panthenol", "Butylene Glycol",
        "Xylitol", "Xylitylglucoside", "Anhydroxylitol",
      ],
    },
    {
      name: "모이스춰라이징 로션",
      brand: "세타필",
      category: "CREAM" as const,
      price: 18000,
      stock: 200,
      status: "ACTIVE" as const,
      description: "건성·민감성 피부 보습 로션",
      ingredients: [
        "Water", "Glycerin", "Dimethicone", "Caprylic/Capric Triglyceride",
        "Butylene Glycol", "Ceramide NP", "Sodium Hyaluronate",
        "Panthenol", "Allantoin", "Propanediol",
      ],
    },
    {
      name: "시카플라스트 밤 B5",
      brand: "라로슈포제",
      category: "CREAM" as const,
      price: 26000,
      stock: 95,
      status: "ACTIVE" as const,
      description: "피부 재생 및 장벽 강화 밤",
      ingredients: [
        "Water", "Glycerin", "Madecassoside", "Centella Asiatica Extract",
        "Panthenol", "Allantoin", "Ceramide NP", "Sodium Hyaluronate",
        "Butylene Glycol", "Niacinamide",
      ],
    },
    {
      name: "UV에이스 선크림 SPF50+ PA++++",
      brand: "닥터지",
      category: "SUNSCREEN" as const,
      price: 24000,
      stock: 85,
      status: "ACTIVE" as const,
      description: "자외선 차단 + 진정 선크림",
      ingredients: [
        "Water", "Titanium Dioxide", "Zinc Oxide", "Glycerin",
        "Niacinamide", "Centella Asiatica Extract", "Allantoin",
        "Panthenol", "Sodium Hyaluronate", "Dimethicone",
      ],
    },
    {
      name: "로우 분자 히알루론산 토너",
      brand: "토리든",
      category: "TONER" as const,
      price: 22000,
      stock: 140,
      status: "ACTIVE" as const,
      description: "저분자 히알루론산 보습 토너",
      ingredients: [
        "Water", "Hyaluronic Acid", "Sodium Hyaluronate", "Beta-Glucan",
        "Glycerin", "Propanediol", "Panthenol", "Allantoin",
        "Butylene Glycol", "Adenosine",
      ],
    },
  ];

  let productCount = 0;
  for (const p of products) {
    const brand = brandMap[p.brand];
    if (!brand) {
      console.warn(`Brand not found: ${p.brand}`);
      continue;
    }

    const barcode = `SEED-${p.brand}-${p.name}`.slice(0, 50);
    let product = await prisma.productMaster.findFirst({ where: { barcode } });
    if (!product) {
      product = await prisma.productMaster.create({
        data: {
          name: p.name,
          brandId: brand.id,
          category: p.category,
          price: p.price,
          stock: p.stock,
          status: p.status,
          description: p.description,
          barcode,
          ingredientCount: p.ingredients.length,
          dataStatus: "SUCCESS",
        },
      });
    }

    // Upsert product ingredients
    for (let i = 0; i < p.ingredients.length; i++) {
      const ing = ingMap[p.ingredients[i]];
      if (!ing) {
        console.warn(`Ingredient not found: ${p.ingredients[i]}`);
        continue;
      }
      await prisma.productIngredient.upsert({
        where: { productId_ingredientId: { productId: product.id, ingredientId: ing.id } },
        update: { orderIndex: i + 1 },
        create: {
          productId: product.id,
          ingredientId: ing.id,
          orderIndex: i + 1,
        },
      });
    }
    productCount++;
  }

  console.log(`✅ ${productCount} products created with ingredients`);
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
