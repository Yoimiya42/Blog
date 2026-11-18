"use client";

import type { Editor } from "@tiptap/react";
import { useId, useState, type KeyboardEvent } from "react";

import {
  ACCEPTED_IMAGE_TYPES,
  uploadImage,
  type ImageUploadConfig,
} from "./upload-image";

const FIELD_CLASS =
  "min-h-11 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-900";
const ACTION_CLASS =
  "flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-stone-700 hover:bg-stone-200 disabled:text-stone-400 disabled:hover:bg-transparent";

interface ImagePanelProps {
  editor: Editor;
  config: ImageUploadConfig;
  /** A file chosen by paste, or null to choose one here. */
  file: File | null;
  onFileChange: (file: File | null) => void;
  onClose: () => void;
}

/**
 * Upload form for one image. Its fields carry no `name`, so the surrounding
 * post form never submits them.
 */
export function ImagePanel({
  editor,
  config,
  file,
  onFileChange,
  onClose,
}: ImagePanelProps) {
  const fieldId = useId();
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);

    const result = await uploadImage(config, file, alt);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    editor
      .chain()
      .focus()
      .insertArticleImage({ mediaId: result.mediaId, alt: result.alt })
      .run();
    onFileChange(null);
    onClose();
  }

  function onKeyDown(event: KeyboardEvent) {
    // Enter would otherwise submit the surrounding post form.
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
    } else if (event.key === "Escape") {
      onClose();
      editor.commands.focus();
    }
  }

  return (
    <div className="mt-1 space-y-2 border-t border-stone-200 p-2">
      <div>
        <label
          className="block text-sm font-medium"
          htmlFor={`${fieldId}-file`}
        >
          Image file
        </label>
        <input
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="mt-2 block w-full text-sm"
          disabled={busy}
          id={`${fieldId}-file`}
          onChange={(event) => {
            onFileChange(event.target.files?.[0] ?? null);
            setError(null);
          }}
          type="file"
        />
        {file ? (
          <p className="mt-1 text-sm text-stone-600">
            Selected: {file.name || "pasted image"}
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor={`${fieldId}-alt`}>
          Alt text
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            aria-describedby={`${fieldId}-hint`}
            className={FIELD_CLASS}
            disabled={busy}
            id={`${fieldId}-alt`}
            maxLength={500}
            onChange={(event) => setAlt(event.target.value)}
            onKeyDown={onKeyDown}
            type="text"
            value={alt}
          />
          <button
            className={ACTION_CLASS}
            disabled={!file || busy}
            onClick={() => void submit()}
            type="button"
          >
            {busy ? "Uploading…" : "Upload and insert"}
          </button>
          <button
            className={ACTION_CLASS}
            disabled={busy}
            onClick={() => {
              onFileChange(null);
              onClose();
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
        <p className="mt-1 text-sm text-stone-600" id={`${fieldId}-hint`}>
          Leave empty for a decorative image. Location data is removed on
          upload.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
