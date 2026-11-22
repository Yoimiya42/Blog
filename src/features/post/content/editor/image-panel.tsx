"use client";

import {
  ArrowLeft,
  Check,
  ImageUp,
  Images,
  LoaderCircle,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";

import type { LibraryImage } from "../image-upload";
import { ACCEPTED_IMAGE_TYPES } from "./upload-image";

export type ImageUploadStatus =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string }
  | { kind: "inserted"; mediaId: string; alt: string }
  | { kind: "error"; message: string }
  /** `items` is null while the library loads. */
  | { kind: "library"; items: LibraryImage[] | null };

const ICON_BUTTON_CLASS =
  "flex size-9 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:pointer-events-none disabled:opacity-40";
const TILE_CLASS =
  "flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border px-4 text-center transition-colors";

interface ImagePanelProps {
  status: ImageUploadStatus;
  /** Starts the upload at once; there is no separate confirm step. */
  onChooseFile: (file: File) => void;
  onAltChange: (alt: string) => void;
  onClose: () => void;
  /** Absent hides the library button. */
  onOpenLibrary?: () => void;
  onPickLibraryImage: (image: LibraryImage) => void;
  onBackToUpload: () => void;
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
  onOpenLibrary,
  onPickLibraryImage,
  onBackToUpload,
}: ImagePanelProps) {
  if (status.kind === "library") {
    return (
      <LibraryPicker
        items={status.items}
        onBack={onBackToUpload}
        onClose={onClose}
        onPick={onPickLibraryImage}
      />
    );
  }

  if (status.kind === "inserted") {
    return (
      <AltTextField alt={status.alt} onChange={onAltChange} onDone={onClose} />
    );
  }

  const uploading = status.kind === "uploading";

  return (
    <PanelFrame closeDisabled={uploading} onClose={onClose}>
      <div className="flex gap-2">
        <DropZone
          disabled={uploading}
          fileName={uploading ? status.fileName : null}
          onChooseFile={onChooseFile}
        />
        {onOpenLibrary ? (
          <button
            aria-label="Choose from library"
            className={`${TILE_CLASS} w-28 shrink-0 border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900 disabled:pointer-events-none disabled:opacity-40`}
            disabled={uploading}
            onClick={onOpenLibrary}
            type="button"
          >
            <Images aria-hidden className="size-5" />
            <span className="text-sm font-medium">Library</span>
          </button>
        ) : null}
      </div>
      {status.kind === "error" ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {status.message}
        </p>
      ) : null}
    </PanelFrame>
  );
}

/** Shared chrome: content on the left, close on the right, Escape closes. */
function PanelFrame({
  children,
  closeDisabled = false,
  onClose,
}: {
  children: ReactNode;
  closeDisabled?: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="mt-1 flex items-start gap-2 border-t border-stone-200 p-3"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !closeDisabled) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <button
        aria-label="Close"
        className={ICON_BUTTON_CLASS}
        disabled={closeDisabled}
        onClick={onClose}
        type="button"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}

/**
 * A styled label around a visually hidden file input. The native input
 * renders its button text in the browser's language, so it is never shown.
 */
function DropZone({
  disabled,
  fileName,
  onChooseFile,
}: {
  disabled: boolean;
  fileName: string | null;
  onChooseFile: (file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onChooseFile(file);
  }

  const state = disabled
    ? "cursor-default border-stone-200 text-stone-500"
    : dragging
      ? "cursor-copy border-stone-900 bg-stone-100 text-stone-900"
      : "cursor-pointer border-stone-300 text-stone-600 hover:border-stone-500 hover:bg-stone-50 hover:text-stone-900";

  return (
    <label
      className={`${TILE_CLASS} min-w-0 flex-1 border-dashed has-[input:focus-visible]:border-stone-900 ${state}`}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDrop={onDrop}
    >
      <input
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so choosing the same file again fires a change.
          event.target.value = "";
          if (file) onChooseFile(file);
        }}
        type="file"
      />
      {fileName === null ? (
        <>
          <ImageUp aria-hidden className="size-5" />
          <span className="text-sm font-medium">Upload image</span>
          <span className="text-xs text-stone-500">
            JPEG, PNG, WebP · 50 MB
          </span>
        </>
      ) : (
        <span
          className="flex max-w-full flex-col items-center gap-1.5"
          role="status"
        >
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
          <span className="text-sm font-medium">Uploading</span>
          <span className="max-w-full truncate text-xs text-stone-500">
            {fileName}
          </span>
        </span>
      )}
    </label>
  );
}

function AltTextField({
  alt,
  onChange,
  onDone,
}: {
  alt: string;
  onChange: (alt: string) => void;
  onDone: () => void;
}) {
  return (
    <PanelFrame onClose={onDone}>
      <p
        className="flex items-center gap-1.5 text-sm font-medium text-stone-900"
        role="status"
      >
        <Check aria-hidden className="size-4 text-green-700" />
        Image inserted
      </p>
      <input
        aria-label="Alt text"
        className="mt-2 h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm outline-none placeholder:text-stone-400 focus:border-stone-900"
        maxLength={500}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Enter would otherwise submit the surrounding post form.
          if (event.key === "Enter") {
            event.preventDefault();
            onDone();
          }
        }}
        placeholder="Alt text · leave empty if decorative"
        type="text"
        value={alt}
      />
    </PanelFrame>
  );
}

interface LibraryPickerProps {
  items: LibraryImage[] | null;
  onPick: (image: LibraryImage) => void;
  onBack: () => void;
  onClose: () => void;
}

/* eslint-disable @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021). */
function LibraryPicker({ items, onPick, onBack, onClose }: LibraryPickerProps) {
  // The Library button that opened this view unmounts; keep focus inside the
  // panel so Escape and Tab still work.
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => backRef.current?.focus(), []);

  return (
    <PanelFrame onClose={onClose}>
      <div className="flex items-center gap-1">
        <button
          ref={backRef}
          aria-label="Back"
          className={`${ICON_BUTTON_CLASS} -ml-2`}
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden className="size-4" />
        </button>
        <p className="text-sm font-medium">Library</p>
      </div>
      {items === null ? (
        <p
          className="flex items-center gap-2 py-6 text-sm text-stone-500"
          role="status"
        >
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          Loading
        </p>
      ) : items.length === 0 ? (
        <p className="py-6 text-sm text-stone-500">No images yet.</p>
      ) : (
        <ul className="mt-2 grid max-h-80 grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2 overflow-y-auto">
          {items.map((image) => (
            <li key={image.id}>
              <button
                aria-label={`Insert ${image.alt || "image without alt text"}`}
                className="block w-full overflow-hidden rounded-lg ring-1 ring-stone-200 transition hover:ring-2 hover:ring-stone-900 focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:outline-none"
                onClick={() => onPick(image)}
                type="button"
              >
                <img
                  alt=""
                  className="aspect-square w-full object-cover"
                  decoding="async"
                  height={image.height}
                  loading="lazy"
                  src={image.thumbnailUrl}
                  width={image.width}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </PanelFrame>
  );
}
/* eslint-enable @next/next/no-img-element */
