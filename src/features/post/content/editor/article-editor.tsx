"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useState } from "react";

import { ARTICLE_PROSE_CLASS } from "../prose";
import type { ArticleDocument } from "../types";
import { articleEditorExtensions } from "./extensions";
import { normalizeEditorDocument } from "./normalize";
import { EditorToolbar } from "./toolbar";
import { ACCEPTED_IMAGE_TYPES, type ImageUploadConfig } from "./upload-image";

/** The first image file on the clipboard, if the browser exposes one. */
function pastedImage(event: ClipboardEvent): File | null {
  for (const file of Array.from(event.clipboardData?.files ?? [])) {
    if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return file;
  }
  return null;
}

interface ArticleEditorProps {
  /** A document that already passed schema validation. */
  initialDocument: ArticleDocument;
  /** Form field that carries the serialised document. */
  name: string;
  /** Id of the element that labels the editing area. */
  labelledBy: string;
  /**
   * Receives the serialised document after each edit. Read once, when the
   * editor is created, so it must be stable for the life of the component.
   */
  onChange?: (serialized: string) => void;
  /** Called when the editing area loses focus. Same stability rule. */
  onBlur?: () => void;
  /** Enables the image control and image paste. Same stability rule. */
  imageUpload?: ImageUploadConfig;
}

// The box around the editing area. Fluid by design: no fixed widths. Prose
// styles are shared with the rendered article.
const CONTENT_CLASS = [
  "min-h-64 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none",
  "focus:border-stone-900 focus:ring-4 focus:ring-black/5",
  // An atom such as an image has no cursor, so its selection must be visible.
  "[&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-stone-900",
  ARTICLE_PROSE_CLASS,
].join(" ");

/**
 * Default export so the form can load it with a dynamic import: the editor
 * runtime stays out of every statically imported module graph.
 */
export default function ArticleEditor({
  initialDocument,
  name,
  labelledBy,
  onChange,
  onBlur,
  imageUpload,
}: ArticleEditorProps) {
  const [imagePanelOpen, setImagePanelOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
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
      // A pasted image opens the upload panel instead of being inserted: the
      // schema accepts only stored media, and the owner adds alt text first.
      handlePaste: (_view, event) => {
        if (!imageUpload) return false;
        const file = pastedImage(event);
        if (!file) return false;

        setImageFile(file);
        setImagePanelOpen(true);
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      const next = JSON.stringify(normalizeEditorDocument(current.getJSON()));
      setSerialized(next);
      onChange?.(next);
    },
    onBlur: () => onBlur?.(),
  });

  return (
    <div>
      {editor ? (
        <EditorToolbar
          editor={editor}
          image={
            imageUpload
              ? {
                  config: imageUpload,
                  open: imagePanelOpen,
                  file: imageFile,
                  onOpenChange: setImagePanelOpen,
                  onFileChange: setImageFile,
                }
              : undefined
          }
        />
      ) : null}
      <EditorContent editor={editor} />
      <input name={name} readOnly type="hidden" value={serialized} />
    </div>
  );
}
