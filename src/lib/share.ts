// ============================================================
// COSFIT - Share Utilities
// src/lib/share.ts
// ============================================================
// Web Share API + Clipboard fallback + Image capture helpers
// ============================================================

import type { CompareResultDetail } from "@/app/(user)/compare/actions";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface ShareContent {
  title: string;
  text: string;
  url: string;
}

interface ShareResult {
  success: boolean;
  method: "native" | "clipboard" | "fallback";
  error?: string;
}

// ────────────────────────────────────────────────────────────
// Generate share content from a FIT report
// ────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<string, string> = {
  PERFECT: "PERFECT FIT",
  GOOD: "GOOD FIT",
  FAIR: "FAIR",
  POOR: "POOR FIT",
  RISK: "RISK",
};

export function buildShareContent(report: CompareResultDetail): ShareContent {
  const gradeLabel = GRADE_LABELS[report.fitGrade] ?? report.fitGrade;

  const title = `[COSFIT] ${report.productName}`;

  const text = [
    `[COSFIT] 나에게 이 제품은 ${report.fitScore}점이래요! 당신의 기준과도 비교해보세요.`,
    "",
    `${report.productName} (${report.productBrand})`,
    `🎯 FIT Score: ${report.fitScore}점 (${gradeLabel})`,
    `✅ 매칭: ${report.matchedGood.length}개 · ⚠️ 주의: ${report.matchedRisk.length}개`,
  ].join("\n");

  const url = buildShareUrl(report.id);

  return { title, text, url };
}

export function buildShareUrl(compareId: string): string {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL ?? "https://cosfit.kr";
  return `${baseUrl}/share/${compareId}`;
}

// ────────────────────────────────────────────────────────────
// Web Share API (모바일 네이티브 공유)
// ────────────────────────────────────────────────────────────

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && !!navigator.share;
}

export async function nativeShare(content: ShareContent): Promise<ShareResult> {
  if (!canNativeShare()) {
    return { success: false, method: "native", error: "Web Share API not supported" };
  }

  try {
    await navigator.share({
      title: content.title,
      text: content.text,
      url: content.url,
    });
    return { success: true, method: "native" };
  } catch (err: any) {
    if (err.name === "AbortError") {
      // User cancelled — not an error
      return { success: false, method: "native", error: "cancelled" };
    }
    return { success: false, method: "native", error: err.message };
  }
}

// ────────────────────────────────────────────────────────────
// Clipboard Copy (Fallback)
// ────────────────────────────────────────────────────────────

export async function copyToClipboard(content: ShareContent): Promise<ShareResult> {
  const fullText = `${content.text}\n\n${content.url}`;

  // Try modern Clipboard API
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(fullText);
      return { success: true, method: "clipboard" };
    } catch {
      // Fall through to legacy method
    }
  }

  // Legacy execCommand fallback
  try {
    const textarea = document.createElement("textarea");
    textarea.value = fullText;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, fullText.length);
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return { success: true, method: "fallback" };
  } catch (err: any) {
    return { success: false, method: "fallback", error: err.message };
  }
}

// ────────────────────────────────────────────────────────────
// Smart Share (Native → Clipboard fallback)
// ────────────────────────────────────────────────────────────

export async function smartShare(report: CompareResultDetail): Promise<ShareResult> {
  const content = buildShareContent(report);

  if (canNativeShare()) {
    const result = await nativeShare(content);
    if (result.success || result.error === "cancelled") {
      return result;
    }
    // If native share fails, fall through to clipboard
  }

  return copyToClipboard(content);
}

// ────────────────────────────────────────────────────────────
// Image Capture (html-to-image wrapper)
// 실제 배포 시 html-to-image 패키지 설치 후 활성화:
//   npm install html-to-image
// ────────────────────────────────────────────────────────────

export async function captureElementAsImage(
  element: HTMLElement,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Dynamic import to avoid SSR issues
    // import { toPng } from "html-to-image";
    // 실제 배포 시:
    /*
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#FDFBF9",
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
    return { success: true };
    */

    // Canvas-based fallback (limited styling support)
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = element.offsetWidth * scale;
    canvas.height = element.offsetHeight * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    ctx.scale(scale, scale);
    ctx.fillStyle = "#FDFBF9";
    ctx.fillRect(0, 0, element.offsetWidth, element.offsetHeight);

    // SVG foreignObject approach
    const serialized = new XMLSerializer().serializeToString(element);
    const svgStr = `
      <svg xmlns="http://www.w3.org/2000/svg" 
           width="${element.offsetWidth}" 
           height="${element.offsetHeight}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${serialized}</div>
        </foreignObject>
      </svg>
    `;

    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    return new Promise((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (pngBlob) => {
            if (pngBlob) {
              const link = document.createElement("a");
              link.download = filename;
              link.href = URL.createObjectURL(pngBlob);
              link.click();
              URL.revokeObjectURL(link.href);
              resolve({ success: true });
            } else {
              resolve({ success: false, error: "Failed to create PNG blob" });
            }
          },
          "image/png"
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ success: false, error: "Failed to render image" });
      };
      img.src = url;
    });
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ────────────────────────────────────────────────────────────
// Generate image filename
// ────────────────────────────────────────────────────────────

export function generateImageFilename(report: CompareResultDetail): string {
  const sanitizedName = report.productName
    .replace(/[^a-zA-Z0-9가-힣]/g, "")
    .slice(0, 20);
  return `cosfit-fit${report.fitScore}-${sanitizedName}.png`;
}
