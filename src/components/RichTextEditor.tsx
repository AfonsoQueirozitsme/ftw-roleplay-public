import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";

type JSONContent = any;

type Props = {
  value: JSONContent | null;          // conteúdo TipTap (JSON) ou null
  onChange: (json: JSONContent, plainText: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Escreve aqui…",
  className = "",
  readOnly = false,
}: Props) {
  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
        codeBlock: {},   // ← em vez de true
        blockquote: {},  // ← em vez de true
      }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Underline,
      Highlight,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const plain = editor.getText(); // útil para preencher description/notes simples
      onChange(json, plain);
    },
  });

  useEffect(() => {
    if (!editor) return;
    // usar SetContentOptions em vez de boolean
    editor.commands.setContent(
      value ?? { type: "doc", content: [{ type: "paragraph" }] },
      { emitUpdate: false }
    );
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={`rounded-2xl border border-white/15 bg-white/5 ${className}`}>
      {!readOnly && (
        <div className="flex flex-wrap gap-1 border-b border-white/10 p-2 text-sm text-white/80">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>B</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}><i>I</i></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}><u>U</u></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>S</ToolbarButton>
          <Divider/>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>• Lista</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>1. Lista</ToolbarButton>
          <Divider/>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>❝</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}>{`</>`}</ToolbarButton>
          <Divider/>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })}>↤</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })}>↔</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })}>↦</ToolbarButton>
          <Divider/>
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>↶</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>↷</ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} className="prose prose-invert max-w-none p-3 focus:outline-none" />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  children,
}: { onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 transition border ${active ? "bg-white/20 border-white/30" : "bg-transparent border-white/10 hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}
function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/10" />;
}
