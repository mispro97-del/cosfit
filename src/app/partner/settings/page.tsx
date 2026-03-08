"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPartnerSettings,
  updateBasicInfo,
  updateContactInfo,
  updateManagerInfo,
  updateTaxInfo,
  type PartnerSettingsData,
} from "./actions";

// ── Section feedback ──

type SectionKey = "basic" | "contact" | "manager" | "tax";

interface Feedback {
  type: "success" | "error";
  message: string;
}

// ── Input component ──

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  readonly = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  readonly?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#4B5563] mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readonly}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 border border-[#E5E9ED] rounded-lg text-sm outline-none transition-colors ${
          readonly
            ? "bg-[#F3F4F6] text-[#6B7280] cursor-not-allowed"
            : "bg-white focus:border-[#10B981]"
        }`}
      />
    </div>
  );
}

// ── Save button ──

function SaveButton({
  onClick,
  loading,
  feedback,
}: {
  onClick: () => void;
  loading: boolean;
  feedback: Feedback | null;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-6 py-2.5 bg-[#10B981] text-white rounded-lg text-sm font-semibold hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "저장 중..." : "저장"}
      </button>
      {feedback && (
        <span
          className={`text-sm font-medium ${
            feedback.type === "success" ? "text-[#10B981]" : "text-red-500"
          }`}
        >
          {feedback.type === "success" ? "\u2713 " : ""}{feedback.message}
        </span>
      )}
    </div>
  );
}

// ── Section card ──

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E9ED] p-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-[#1A1D21]">{title}</h2>
        {description && (
          <p className="text-xs text-[#9CA3AF] mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main page ──

export default function PartnerSettingsPage() {
  const [settings, setSettings] = useState<PartnerSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [feedback, setFeedback] = useState<Record<SectionKey, Feedback | null>>({
    basic: null,
    contact: null,
    manager: null,
    tax: null,
  });

  // Basic info
  const [companyName, setCompanyName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Contact info
  const [mobile, setMobile] = useState("");
  const [contactInfoEmail, setContactInfoEmail] = useState("");
  const [productInquiry, setProductInquiry] = useState("");
  const [officePhone, setOfficePhone] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");

  // Manager info
  const [managerName, setManagerName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");

  // Tax info
  const [bizDocUrl, setBizDocUrl] = useState("");
  const [taxEmail, setTaxEmail] = useState("");
  const [taxEmailSecondary, setTaxEmailSecondary] = useState("");

  const showFeedback = useCallback((section: SectionKey, fb: Feedback) => {
    setFeedback((prev) => ({ ...prev, [section]: fb }));
    setTimeout(() => {
      setFeedback((prev) => ({ ...prev, [section]: null }));
    }, 3000);
  }, []);

  useEffect(() => {
    (async () => {
      const result = await getPartnerSettings();
      if (result.success && result.data) {
        const d = result.data;
        setSettings(d);
        setCompanyName(d.companyName);
        setRepresentativeName(d.representativeName);
        setContactEmail(d.contactEmail);
        setContactPhone(d.contactPhone ?? "");

        setMobile(d.contactInfo?.mobile ?? "");
        setContactInfoEmail(d.contactInfo?.email ?? "");
        setProductInquiry(d.contactInfo?.productInquiry ?? "");
        setOfficePhone(d.contactInfo?.officePhone ?? "");
        setOfficeAddress(d.contactInfo?.officeAddress ?? "");

        setManagerName(d.managerInfo?.name ?? "");
        setDepartment(d.managerInfo?.department ?? "");
        setPosition(d.managerInfo?.position ?? "");

        setBizDocUrl(d.taxInfo?.bizDocUrl ?? "");
        setTaxEmail(d.taxInfo?.taxEmail ?? "");
        setTaxEmailSecondary(d.taxInfo?.taxEmailSecondary ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const handleSaveBasic = async () => {
    setSavingSection("basic");
    const result = await updateBasicInfo({
      companyName,
      representativeName,
      contactEmail,
      contactPhone,
    });
    setSavingSection(null);
    showFeedback(
      "basic",
      result.success
        ? { type: "success", message: "저장되었습니다." }
        : { type: "error", message: result.error ?? "저장에 실패했습니다." }
    );
  };

  const handleSaveContact = async () => {
    setSavingSection("contact");
    const result = await updateContactInfo({
      mobile,
      email: contactInfoEmail,
      productInquiry,
      officePhone,
      officeAddress,
    });
    setSavingSection(null);
    showFeedback(
      "contact",
      result.success
        ? { type: "success", message: "저장되었습니다." }
        : { type: "error", message: result.error ?? "저장에 실패했습니다." }
    );
  };

  const handleSaveManager = async () => {
    setSavingSection("manager");
    const result = await updateManagerInfo({
      name: managerName,
      department,
      position,
    });
    setSavingSection(null);
    showFeedback(
      "manager",
      result.success
        ? { type: "success", message: "저장되었습니다." }
        : { type: "error", message: result.error ?? "저장에 실패했습니다." }
    );
  };

  const handleSaveTax = async () => {
    setSavingSection("tax");
    const result = await updateTaxInfo({
      bizDocUrl,
      taxEmail,
      taxEmailSecondary,
    });
    setSavingSection(null);
    showFeedback(
      "tax",
      result.success
        ? { type: "success", message: "저장되었습니다." }
        : { type: "error", message: result.error ?? "저장에 실패했습니다." }
    );
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-[#9CA3AF]">설정 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-red-500">파트너 정보를 불러올 수 없습니다. 다시 로그인해주세요.</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[800px]">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A1D21]">설정</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">입점사 정보를 관리합니다.</p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Basic Info */}
        <SectionCard title="기본 정보" description="회사 기본 정보를 관리합니다.">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="회사명"
                value={companyName}
                onChange={setCompanyName}
                required
              />
              <Field
                label="대표자명"
                value={representativeName}
                onChange={setRepresentativeName}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="대표 이메일"
                value={contactEmail}
                onChange={setContactEmail}
                type="email"
                required
              />
              <Field
                label="대표 전화번호"
                value={contactPhone}
                onChange={setContactPhone}
                type="tel"
                placeholder="02-1234-5678"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="파트너 상태"
                value={
                  settings.status === "APPROVED"
                    ? "승인됨"
                    : settings.status === "PENDING"
                    ? "심사 중"
                    : settings.status === "SUSPENDED"
                    ? "일시중지"
                    : "해지"
                }
                readonly
              />
              <Field
                label="등급"
                value={settings.tier}
                readonly
              />
            </div>
            <SaveButton
              onClick={handleSaveBasic}
              loading={savingSection === "basic"}
              feedback={feedback.basic}
            />
          </div>
        </SectionCard>

        {/* Section 2: Contact Info */}
        <SectionCard title="연락처 정보" description="비즈니스 연락처를 관리합니다.">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="휴대전화번호"
                value={mobile}
                onChange={setMobile}
                type="tel"
                placeholder="010-1234-5678"
              />
              <Field
                label="이메일"
                value={contactInfoEmail}
                onChange={setContactInfoEmail}
                type="email"
                placeholder="contact@company.com"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="제품 문의 전화번호"
                value={productInquiry}
                onChange={setProductInquiry}
                type="tel"
                placeholder="1588-0000"
              />
              <Field
                label="일반전화"
                value={officePhone}
                onChange={setOfficePhone}
                type="tel"
                placeholder="02-1234-5678"
              />
            </div>
            <Field
              label="사무실 주소"
              value={officeAddress}
              onChange={setOfficeAddress}
              placeholder="서울특별시 강남구 ..."
            />
            <SaveButton
              onClick={handleSaveContact}
              loading={savingSection === "contact"}
              feedback={feedback.contact}
            />
          </div>
        </SectionCard>

        {/* Section 3: Manager Info */}
        <SectionCard title="담당자 정보" description="입점 담당자 정보를 관리합니다.">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label="이름"
                value={managerName}
                onChange={setManagerName}
                placeholder="홍길동"
              />
              <Field
                label="부서"
                value={department}
                onChange={setDepartment}
                placeholder="마케팅팀"
              />
              <Field
                label="직책"
                value={position}
                onChange={setPosition}
                placeholder="팀장"
              />
            </div>
            <SaveButton
              onClick={handleSaveManager}
              loading={savingSection === "manager"}
              feedback={feedback.manager}
            />
          </div>
        </SectionCard>

        {/* Section 4: Tax Invoice Info */}
        <SectionCard title="세금계산서 정보" description="세금계산서 발행에 필요한 정보를 관리합니다.">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="사업자등록번호"
                value={settings.businessNumber}
                readonly
              />
              <Field
                label="상호명"
                value={settings.companyName}
                readonly
              />
            </div>
            <Field
              label="대표자명"
              value={settings.representativeName}
              readonly
            />
            <Field
              label="사업자등록증 URL"
              value={bizDocUrl}
              onChange={setBizDocUrl}
              placeholder="https://..."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="세금계산서 수신 이메일 (필수)"
                value={taxEmail}
                onChange={setTaxEmail}
                type="email"
                placeholder="tax@company.com"
                required
              />
              <Field
                label="세금계산서 수신 이메일 (보조)"
                value={taxEmailSecondary}
                onChange={setTaxEmailSecondary}
                type="email"
                placeholder="tax2@company.com"
              />
            </div>
            <SaveButton
              onClick={handleSaveTax}
              loading={savingSection === "tax"}
              feedback={feedback.tax}
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
