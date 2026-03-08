"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ── Types ──

interface ContactInfo {
  mobile?: string;
  email?: string;
  productInquiry?: string;
  officePhone?: string;
  officeAddress?: string;
}

interface ManagerInfo {
  name?: string;
  department?: string;
  position?: string;
}

interface TaxInfo {
  bizDocUrl?: string;
  taxEmail?: string;
  taxEmailSecondary?: string;
}

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PartnerSettingsData {
  id: string;
  companyName: string;
  businessNumber: string;
  representativeName: string;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
  tier: string;
  contactInfo: ContactInfo | null;
  managerInfo: ManagerInfo | null;
  taxInfo: TaxInfo | null;
}

// ── Auth Helper ──

async function getAuthenticatedPartnerId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { partnerId: true },
  });
  return user?.partnerId ?? null;
}

// ── Actions ──

export async function getPartnerSettings(): Promise<ActionResult<PartnerSettingsData>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });
    if (!partner) return { success: false, error: "파트너 정보를 찾을 수 없습니다." };

    return {
      success: true,
      data: {
        id: partner.id,
        companyName: partner.companyName,
        businessNumber: partner.businessNumber,
        representativeName: partner.representativeName,
        contactEmail: partner.contactEmail,
        contactPhone: partner.contactPhone,
        status: partner.status,
        tier: partner.tier,
        contactInfo: (partner as any).contactInfo as ContactInfo | null,
        managerInfo: (partner as any).managerInfo as ManagerInfo | null,
        taxInfo: (partner as any).taxInfo as TaxInfo | null,
      },
    };
  } catch (error) {
    console.error("[getPartnerSettings Error]", error);
    return { success: false, error: "설정 정보를 불러오는 데 실패했습니다." };
  }
}

export async function updateBasicInfo(data: {
  companyName: string;
  representativeName: string;
  contactEmail: string;
  contactPhone: string;
}): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  if (!data.companyName.trim()) return { success: false, error: "회사명을 입력해주세요." };
  if (!data.representativeName.trim()) return { success: false, error: "대표자명을 입력해주세요." };
  if (!data.contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
    return { success: false, error: "올바른 이메일 형식을 입력해주세요." };
  }

  try {
    await prisma.partner.update({
      where: { id: partnerId },
      data: {
        companyName: data.companyName.trim(),
        representativeName: data.representativeName.trim(),
        contactEmail: data.contactEmail.trim(),
        contactPhone: data.contactPhone.trim() || null,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("[updateBasicInfo Error]", error);
    return { success: false, error: "기본 정보 저장에 실패했습니다." };
  }
}

export async function updateContactInfo(data: ContactInfo): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { success: false, error: "올바른 이메일 형식을 입력해주세요." };
  }

  try {
    await prisma.partner.update({
      where: { id: partnerId },
      data: { contactInfo: data as any },
    });
    return { success: true };
  } catch (error) {
    console.error("[updateContactInfo Error]", error);
    return { success: false, error: "연락처 정보 저장에 실패했습니다." };
  }
}

export async function updateManagerInfo(data: ManagerInfo): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    await prisma.partner.update({
      where: { id: partnerId },
      data: { managerInfo: data as any },
    });
    return { success: true };
  } catch (error) {
    console.error("[updateManagerInfo Error]", error);
    return { success: false, error: "담당자 정보 저장에 실패했습니다." };
  }
}

export async function updateTaxInfo(data: TaxInfo): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  if (!data.taxEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.taxEmail)) {
    return { success: false, error: "세금계산서 수신 이메일을 올바르게 입력해주세요." };
  }
  if (data.taxEmailSecondary && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.taxEmailSecondary)) {
    return { success: false, error: "보조 이메일 형식이 올바르지 않습니다." };
  }

  try {
    await prisma.partner.update({
      where: { id: partnerId },
      data: { taxInfo: data as any },
    });
    return { success: true };
  } catch (error) {
    console.error("[updateTaxInfo Error]", error);
    return { success: false, error: "세금계산서 정보 저장에 실패했습니다." };
  }
}
