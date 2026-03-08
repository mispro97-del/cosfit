"use client";

import { useState } from "react";

export default function PartnerSettingsPage() {
  const [companyName, setCompanyName] = useState("에스트라");
  const [repName, setRepName] = useState("김대표");
  const [email, setEmail] = useState("mispro97+partner@gmail.com");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 max-w-[700px]">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A1D21] m-0">⚙️ 설정</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">입점사 정보 관리</p>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E9ED] p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#4B5563] mb-1.5">회사명</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#E5E9ED] rounded-lg text-sm outline-none focus:border-[#10B981] transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4B5563] mb-1.5">대표자명</label>
          <input
            type="text"
            value={repName}
            onChange={(e) => setRepName(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#E5E9ED] rounded-lg text-sm outline-none focus:border-[#10B981] transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4B5563] mb-1.5">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#E5E9ED] rounded-lg text-sm outline-none focus:border-[#10B981] transition-colors"
          />
        </div>
        <div className="pt-2">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#10B981] text-white rounded-lg text-sm font-semibold hover:bg-[#059669] transition-colors"
          >
            {saved ? "✓ 저장됨" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
