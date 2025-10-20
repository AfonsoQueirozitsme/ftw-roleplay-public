import React, { useMemo, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Code,
  Eye,
  EyeOff,
} from "lucide-react";
import { markdownToHtml } from "@/utils/markdown";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  maxLength?: number;
  label?: string;
};

const BUTTON_BASE =
  "inline-flex h-9 w-9 items-center justify-center border-r border-white/10 text-white/70 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30";

function ensureTrailingWhitespace(value: string) {
  return value.replace(/\s+$/, (match) => (match.includes("\n") ? "\n" : " ")) + " ";
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minRows = 14,
  maxLength,
  label,
}: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const formattedPreview = useMemo(() => {
    if (!value.trim()) {
      return "<p class=\"opacity-60\">Sem conteudo ainda.</p>";
    }
    return markdownToHtml(value);
  }, [value]);

  const applyWrap = (prefix: string, suffix = prefix, fallback = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    const current = value ?? "";

    const selected = current.slice(selectionStart, selectionEnd) || fallback;
    const next = `${current.slice(0, selectionStart)}${prefix}${selected}${suffix}${current.slice(selectionEnd)}`;

    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const start = selectionStart + prefix.length;
      const end = start + selected.length;
      textarea.setSelectionRange(start, end);
    });
  };

  const applyLinePrefix = (token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    const current = value ?? "";

    const before = current.slice(0, selectionStart);
    const selection = current.slice(selectionStart, selectionEnd);
    const after = current.slice(selectionEnd);

    const lines = selection.split(/\r?\n/);
    const transformed = lines
      .map((line) => {
        const trimmed = line.trimStart();
        if (!trimmed) return `${token} `;
        if (trimmed.startsWith(token)) {
          return trimmed;
        }
        return `${token} ${trimmed}`;
      })
      .join("\n");

    const startLineIndex = before.lastIndexOf("\n") + 1;
    const selectedOrFallback = selection || "";
    const resultSelection = transformed || `${token} `;

    const next =
      before.slice(0, startLineIndex) +
      before.slice(startLineIndex, selectionStart) +
      (selectedOrFallback ? resultSelection : ensureTrailingWhitespace(resultSelection)) +
      after;

    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const prefixAdjustment = selectedOrFallback ? 0 : token.length + 1;
      const start = selectedOrFallback ? selectionStart : selectionStart + prefixAdjustment;
      const end = start + (selectedOrFallback ? resultSelection.length : 0);
      textarea.setSelectionRange(start, end);
    });
  };

  const insertLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    const current = value ?? "";
    const selected = current.slice(selectionStart, selectionEnd);
    const url = window.prompt("URL do link", selected.startsWith("http") ? selected : "https://");
    if (!url) return;
    const labelText = selected || "Texto do link";
    const next = `${current.slice(0, selectionStart)}[${labelText}](${url})${current.slice(selectionEnd)}`;
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const start = selectionStart + 1;
      const end = start + labelText.length;
      textarea.setSelectionRange(start, end);
    });
  };

  const commands = [
    { label: "Negrito", icon: <Bold className="h-4 w-4" />, action: () => applyWrap("**", "**", "texto") },
    { label: "Italico", icon: <Italic className="h-4 w-4" />, action: () => applyWrap("*", "*", "texto") },
    { label: "Código", icon: <Code className="h-4 w-4" />, action: () => applyWrap("`", "`", "snippet") },
    { label: "Título", icon: <Heading className="h-4 w-4" />, action: () => applyLinePrefix("##") },
    { label: "Lista", icon: <List className="h-4 w-4" />, action: () => applyLinePrefix("-") },
    { label: "Lista numerada", icon: <ListOrdered className="h-4 w-4" />, action: () => applyLinePrefix("1.") },
    { label: "Citacao", icon: <Quote className="h-4 w-4" />, action: () => applyLinePrefix(">") },
    { label: "Link", icon: <LinkIcon className="h-4 w-4" />, action: insertLink },
  ];

  return (
    <div className="flex flex-col gap-2 text-white">
      {label && <span className="text-sm text-white/70">{label}</span>}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex overflow-hidden rounded-xl border border-white/15 bg-white/5">
          {commands.map((cmd, index) => (
            <button
              key={cmd.label}
              type="button"
              className={`${BUTTON_BASE} ${index === commands.length - 1 ? "border-r-0" : ""}`}
              onClick={cmd.action}
              title={cmd.label}
            >
              {cmd.icon}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPreview((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/70 transition hover:text-white"
        >
          {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {preview ? "Esconder pre-visualizacao" : "Ver pre-visualizacao"}
        </button>
      </div>

      {!preview && (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={minRows}
          maxLength={maxLength}
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-white/30"
        />
      )}

      {preview && (
        <div
          className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm leading-relaxed text-white/90 prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: formattedPreview }}
        />
      )}
    </div>
  );
}
