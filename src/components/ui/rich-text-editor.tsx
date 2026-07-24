"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["paragraph"],
      }),
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-text-editor__content",
        "data-placeholder": placeholder ?? "Enter content…",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.getHTML();
    const next = value || "<p></p>";
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="rich-text-editor rich-text-editor--loading">Loading editor…</div>;
  }

  return (
    <div className="rich-text-editor">
      <div className="rich-text-editor__toolbar" role="toolbar" aria-label="Text formatting">
        <button
          type="button"
          className={editor.isActive("bold") ? "is-active" : ""}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={editor.isActive("italic") ? "is-active" : ""}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          className={editor.isActive("underline") ? "is-active" : ""}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </button>
        <span className="rich-text-editor__divider" aria-hidden />
        <button
          type="button"
          className={editor.isActive({ textAlign: "left" }) ? "is-active" : ""}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          Left
        </button>
        <button
          type="button"
          className={editor.isActive({ textAlign: "center" }) ? "is-active" : ""}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          Center
        </button>
        <button
          type="button"
          className={editor.isActive({ textAlign: "right" }) ? "is-active" : ""}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          Right
        </button>
        <button
          type="button"
          className={editor.isActive({ textAlign: "justify" }) ? "is-active" : ""}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          Justify
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
