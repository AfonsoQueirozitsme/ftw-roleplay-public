// src/utils/richText.ts
// Helpers to produce, sanitize and consume rich-text (HTML) content.

import DOMPurify from "dompurify";
import { markdownToHtml } from "@/utils/markdown";

const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;

const MARK_ATTRIBUTES = {
  "data-richtext-highlight": "true",
};

type SanitizeOptions = {
  enforceTargetBlank?: boolean;
};

function getPurifier() {
  if (typeof window === "undefined") return null;
  return DOMPurify;
}

function createElement(tag: string) {
  if (typeof window === "undefined") return null;
  return window.document.createElement(tag);
}

function createContainer(html: string) {
  const container = createElement("div");
  if (!container) return null;
  container.innerHTML = html;
  return container;
}

function serializeContainer(container: HTMLElement | null) {
  if (!container) return "";
  return container.innerHTML.trim();
}

function normaliseEmpty(html: string) {
  const trimmed = html.trim();
  if (!trimmed) return "";
  if (trimmed === "<p><br></p>" || trimmed === "<p></p>") return "";
  return trimmed;
}

export function sanitizeRichText(input: string, options: SanitizeOptions = {}): string {
  if (!input) return "";
  const purifier = getPurifier();
  const base = purifier
    ? purifier.sanitize(input, {
        USE_PROFILES: { html: true },
        RETURN_DOM_FRAGMENT: !!options.enforceTargetBlank,
      })
    : input;

  if (!purifier) {
    return normaliseEmpty(base);
  }

  if (options.enforceTargetBlank) {
    const fragment = base as unknown as DocumentFragment;
    const container = createContainer("");
    if (!container) return normaliseEmpty("");
    container.appendChild(fragment);
    container.querySelectorAll("a[href]").forEach((anchor) => {
      if (options.enforceTargetBlank) {
        anchor.setAttribute("target", "_blank");
      }
      anchor.setAttribute("rel", "noopener noreferrer");
    });
    return normaliseEmpty(serializeContainer(container));
  }

  const container = createContainer(base as string);
  if (!container) return normaliseEmpty("");
  container.querySelectorAll("a[href]").forEach((anchor) => {
    if (options.enforceTargetBlank) {
      anchor.setAttribute("target", "_blank");
    } else if (!anchor.getAttribute("target")) {
      anchor.setAttribute("target", "_blank");
    }
    anchor.setAttribute("rel", "noopener noreferrer");
  });
  return normaliseEmpty(serializeContainer(container));
}

export function ensureRichTextValue(source?: string | null): string {
  if (!source) return "";
  const trimmed = source.trim();
  if (!trimmed) return "";
  const html = HTML_TAG_REGEX.test(trimmed) ? trimmed : markdownToHtml(trimmed);
  return sanitizeRichText(html);
}

export function richTextToPlainText(source?: string | null): string {
  if (!source) return "";
  const html = ensureRichTextValue(source);
  if (typeof window === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const container = createContainer(html);
  if (!container) return "";
  return container.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightRichText(source: string, query: string): string {
  const safeSource = ensureRichTextValue(source);
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return safeSource;
  if (typeof window === "undefined") {
    const regex = new RegExp(`(${escapeRegExp(trimmedQuery)})`, "ig");
    return safeSource.replace(regex, (_, match) => `<mark data-richtext-highlight="true">${match}</mark>`);
  }
  const container = createContainer(safeSource);
  if (!container) return safeSource;
  const walker = window.document.createTreeWalker(container, window.NodeFilter.SHOW_TEXT);
  const regex = new RegExp(escapeRegExp(trimmedQuery), "ig");
  const marks: Text[] = [];
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) marks.push(node as Text);
    node = walker.nextNode();
  }

  marks.forEach((textNode) => {
    const value = textNode.nodeValue ?? "";
    if (!regex.test(value)) return;
    regex.lastIndex = 0;
    const fragment = window.document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(window.document.createTextNode(value.slice(lastIndex, match.index)));
      }
      const mark = window.document.createElement("mark");
      Object.entries(MARK_ATTRIBUTES).forEach(([key, val]) => mark.setAttribute(key, val));
      mark.textContent = match[0];
      fragment.appendChild(mark);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < value.length) {
      fragment.appendChild(window.document.createTextNode(value.slice(lastIndex)));
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  return serializeContainer(container);
}

export function isRichTextEmpty(source?: string | null): boolean {
  if (!source) return true;
  const plain = richTextToPlainText(source);
  return plain.length === 0;
}

