"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useState } from "react";

import type { ArticleDocument } from "../types";
import { articleEditorExtensions } from "./extensions";
import { normalizeEditorDocument } from "./normalize";
import { EditorToolbar } from "./toolbar";

interface ArticleEditorProps {
  /** A document that already passed schema validation. */
  initialDocument: ArticleDocument;
  /** Form field that carries the serialised document. */
  name: string;
  /** Id of the element that labels the editing area. */
  labelledBy: string;
}

// Tailwind's reset removes element defaults, and the public article styles do
// not exist yet, so the editing area declares the minimum it needs to show
// structure. Fluid by design: no fixed widths.
const CONTENT_CLASS = [
  "min-h-64 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none",
  "focus:border-stone-900 focus:ring-4 focus:ring-black/5",
  "[&_p]:my-3 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold",
  "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold",
  "[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-stone-300 [&_blockquote]:pl-4",
  "[&_a]:underline [&_hr]:my-6 [&_hr]:border-stone-300",
  "[&_code]:rounded [&_code]:bg-stone-100 [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-stone-900 [&_pre]:p-4 [&_pre]:text-stone-100",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
].join(" ");

/**
 * Default export so the form can load it with a dynamic import: the editor
 * runtime stays out of every statically imported module graph.
 */
export default function ArticleEditor({
  initialDocument,
  name,
  labelledBy,
}: ArticleEditorProps) {
  // Controlled, not a defaultValue: React resets uncontrolled fields after a
  // form action, which would submit the stale initial document on the next
  // save.
  const [serialized, setSerialized] = useState(() =>
    JSON.stringify(initialDocument),
  );

  const editor = useEditor({
    extensions: articleEditorExtensions,
    content: initialDocument,
    // The component is client-only, but TipTap still requires an explicit
    // opt-out to avoid a hydration mismatch warning under React 19.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: CONTENT_CLASS,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelledBy,
      },
    },
    onUpdate: ({ editor: current }) => {
      setSerialized(JSON.stringify(normalizeEditorDocument(current.getJSON())));
    },
  });

  return (
    <div>
      {editor ? <EditorToolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
      <input name={name} readOnly type="hidden" value={serialized} />
    </div>
  );
}
