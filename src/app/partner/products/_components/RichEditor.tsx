// ============================================================
// COSFIT - Rich Editor Component (contentEditable + execCommand)
// No external libraries. Supports HTML paste from other sites.
// ============================================================

"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichEditor({
  value,
  onChange,
  placeholder = "상세 설명을 입력하세요...",
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showSource, setShowSource] = useState(false);
  const [sourceValue, setSourceValue] = useState(value);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const isInitializedRef = useRef(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !isInitializedRef.current) {
      editorRef.current.innerHTML = value;
      isInitializedRef.current = true;
    }
  }, [value]);

  // Sync source view with editor
  useEffect(() => {
    if (showSource) {
      setSourceValue(editorRef.current?.innerHTML ?? value);
    }
  }, [showSource, value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      // Allow rich HTML paste from clipboard (e.g., from Coupang, Naver etc.)
      const clipboardData = e.clipboardData;
      const html = clipboardData.getData("text/html");

      if (html) {
        e.preventDefault();
        // Sanitize: remove script tags but keep structure, images, styles
        const cleaned = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/on\w+="[^"]*"/gi, "")
          .replace(/on\w+='[^']*'/gi, "");

        document.execCommand("insertHTML", false, cleaned);
        handleInput();
      }
      // If no HTML, let browser handle plain text paste naturally
    },
    [handleInput]
  );

  const exec = useCallback(
    (command: string, value?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      handleInput();
    },
    [handleInput]
  );

  const toggleSource = useCallback(() => {
    if (showSource) {
      // Switching from source to visual
      if (editorRef.current) {
        editorRef.current.innerHTML = sourceValue;
        onChange(sourceValue);
      }
    } else {
      // Switching from visual to source
      setSourceValue(editorRef.current?.innerHTML ?? "");
    }
    setShowSource(!showSource);
  }, [showSource, sourceValue, onChange]);

  const insertImage = useCallback(() => {
    if (!imageUrlInput.trim()) return;
    exec("insertHTML", `<img src="${imageUrlInput.trim()}" alt="product image" style="max-width:100%;height:auto;" />`);
    setImageUrlInput("");
    setShowImageInput(false);
  }, [imageUrlInput, exec]);

  const handleSourceChange = useCallback(
    (newSource: string) => {
      setSourceValue(newSource);
    },
    []
  );

  const ToolBtn = ({
    label,
    onClick,
    active,
    title,
  }: {
    label: string;
    onClick: () => void;
    active?: boolean;
    title?: string;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent losing focus from editor
        onClick();
      }}
      title={title ?? label}
      className={`px-2 py-1 text-xs font-medium rounded border-none cursor-pointer transition-colors ${
        active
          ? "bg-[#10B981] text-white"
          : "bg-white text-[#4B5563] hover:bg-[#F3F4F6]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="border border-[#E5E9ED] rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-[#F9FAFB] border-b border-[#E5E9ED]">
        <ToolBtn label="B" onClick={() => exec("bold")} title="굵게" />
        <ToolBtn label="I" onClick={() => exec("italic")} title="기울임" />
        <ToolBtn label="U" onClick={() => exec("underline")} title="밑줄" />
        <div className="w-px h-5 bg-[#E5E9ED] mx-1" />
        <ToolBtn label="H2" onClick={() => exec("formatBlock", "h2")} title="제목 2" />
        <ToolBtn label="H3" onClick={() => exec("formatBlock", "h3")} title="제목 3" />
        <ToolBtn label="P" onClick={() => exec("formatBlock", "p")} title="본문" />
        <div className="w-px h-5 bg-[#E5E9ED] mx-1" />
        <ToolBtn
          label="UL"
          onClick={() => exec("insertUnorderedList")}
          title="불릿 목록"
        />
        <ToolBtn
          label="OL"
          onClick={() => exec("insertOrderedList")}
          title="번호 목록"
        />
        <div className="w-px h-5 bg-[#E5E9ED] mx-1" />
        <ToolBtn
          label="IMG"
          onClick={() => setShowImageInput(!showImageInput)}
          title="이미지 삽입"
        />
        <div className="flex-1" />
        <ToolBtn
          label={showSource ? "에디터" : "HTML"}
          onClick={toggleSource}
          active={showSource}
          title="HTML 소스 보기/편집"
        />
      </div>

      {/* Image URL Input */}
      {showImageInput && !showSource && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-[#E5E9ED]">
          <input
            type="url"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && insertImage()}
            placeholder="이미지 URL을 입력하세요"
            className="flex-1 px-2 py-1 text-sm border border-[#E5E9ED] rounded focus:outline-none focus:border-[#10B981]"
          />
          <button
            type="button"
            onClick={insertImage}
            className="px-3 py-1 text-xs font-medium bg-[#10B981] text-white rounded border-none cursor-pointer hover:bg-[#059669]"
          >
            삽입
          </button>
          <button
            type="button"
            onClick={() => {
              setShowImageInput(false);
              setImageUrlInput("");
            }}
            className="px-2 py-1 text-xs text-[#9CA3AF] bg-transparent border-none cursor-pointer hover:text-[#4B5563]"
          >
            취소
          </button>
        </div>
      )}

      {/* Editor Area */}
      {showSource ? (
        <textarea
          value={sourceValue}
          onChange={(e) => handleSourceChange(e.target.value)}
          className="w-full min-h-[320px] p-4 text-sm font-mono border-none resize-y focus:outline-none bg-[#1A1D21] text-green-400"
          spellCheck={false}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          className="min-h-[320px] p-4 text-sm text-[#1A1D21] focus:outline-none overflow-auto prose prose-sm max-w-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-[#9CA3AF]"
          style={{ wordBreak: "break-word" }}
        />
      )}
    </div>
  );
}
