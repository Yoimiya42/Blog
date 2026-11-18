"use client";

import { useId } from "react";

import { ACCEPTED_IMAGE_TYPES } from "./upload-image";

export type ImageUploadStatus =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string }
  | { kind: "inserted"; mediaId: string; alt: string }
  | { kind: "error"; message: string };

const FIELD_CLASS =
  "min-h-11 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-900";
const ACTION_CLASS =
  "flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-stone-700 hover:bg-stone-200";

interface ImagePanelProps {
  status: ImageUploadStatus;
  /** Starts the upload at once; there is no separate confirm step. */
  onChooseFile: (file: File) => void;
  onAltChange: (alt: string) => void;
  onClose: () => void;
}

/**
 * Upload status and alt text for one image. Its fields carry no `name`, so
 * the surrounding post form never submits them.
 */
export function ImagePanel({
  status,
  onChooseFile,
  onAltChange,
  onClose,
}: ImagePanelProps) {
  const fieldId = useId();

  if (status.kind === "inserted") {
    return (
      <div className="mt-1 space-y-2 border-t border-stone-200 p-2">
        <p className="text-sm text-green-800" role="status">
          Image inserted. Save the post to keep it.
        </p>
        <label className="block text-sm font-medium" htmlFor={`${fieldId}-alt`}>
          Alt text
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-describedby={`${fieldId}-hint`}
            className={FIELD_CLASS}
            id={`${fieldId}-alt`}
            maxLength={500}
            onChange={(event) => onAltChange(event.target.value)}
            onKeyDown={(event) => {
              // Enter would otherwise submit the surrounding post form.
              if (event.key === "Enter" || event.key === "Escape") {
                event.preventDefault();
                onClose();
              }
            }}
            type="text"
            value={status.alt}
          />
          <button className={ACTION_CLASS} onClick={onClose} type="button">
            Done
          </button>
        </div>
        <p className="text-sm text-stone-600" id={`${fieldId}-hint`}>
          Describe the image for screen readers. Leave empty for a decorative
          image.
        </p>
      </div>
    );
  }

  const uploading = status.kind === "uploading";

  return (
    <div className="mt-1 space-y-2 border-t border-stone-200 p-2">
      <label className="block text-sm font-medium" htmlFor={`${fieldId}-file`}>
        Choose an image to upload and insert
      </label>
      <input
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="block w-full text-sm"
        disabled={uploading}
        id={`${fieldId}-file`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so choosing the same file again fires a change.
          event.target.value = "";
          if (file) onChooseFile(file);
        }}
        type="file"
      />
      <p className="text-sm text-stone-600">
        JPEG, PNG, or WebP up to 50 MB. You can also paste or drop an image into
        the editor. Location data is removed on upload.
      </p>
      {uploading ? (
        <p className="text-sm text-stone-700" role="status">
          Uploading {status.fileName}…
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p className="text-sm text-red-700" role="alert">
          {status.message}
        </p>
      ) : null}
      <button
        className={ACTION_CLASS}
        disabled={uploading}
        onClick={onClose}
        type="button"
      >
        Close
      </button>
    </div>
  );
}
