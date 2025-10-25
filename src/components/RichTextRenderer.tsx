import React, { useMemo } from "react";
import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import DOMPurify from "dompurify";

type Props = { value: any; className?: string };

export default function RichTextRenderer({ value, className = "" }: Props) {
  const html = useMemo(() => {
    try {
      const raw = generateHTML(value ?? { type: "doc", content: [] }, [
        StarterKit,
        Link,
        Underline,
        Highlight,
        TextStyle,
        Color,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
      ]);
      return DOMPurify.sanitize(raw);
    } catch {
      return "";
    }
  }, [value]);

  return <div className={`prose prose-invert max-w-none ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
