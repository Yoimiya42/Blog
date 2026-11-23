"use client";

/* eslint-disable @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021). */

import {
  ArrowLeft,
  ImageOff,
  Images,
  LoaderCircle,
  Trash2,
  Upload,
  Wallpaper,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { ImageUploadConfig, LibraryImage } from "../content/image-upload";
import { ACCEPTED_IMAGE_TYPES, uploadImage } from "../content/upload-image";

/** Mirrors the media module's background view (ADR-0031). */
export interface EditorBackgroundState {
  /** Visibility in percent; 0 is Off. */
  opacity: number;
  image: {
    mediaId: string;
    src: string;
    srcSet: string;
    thumbnailUrl: string;
  } | null;
}

export interface EditorBackgroundUpdate {
  /** `null` removes the image; absent keeps it. */
  mediaId?: string | null;
  opacity?: number;
}

export type EditorBackgroundSaveResult =
  | { ok: true; background: EditorBackgroundState }
  | { ok: false; message: string };

/**
 * Passed in by the page, so the editor never imports the media module
 * (ADR-0024). `save` is a Server Action that validates its input.
 */
export interface EditorBackgroundConfig {
  initial: EditorBackgroundState;
  /** Visibility tiers in percent, Off first. */
  opacities: readonly number[];
  save: (update: EditorBackgroundUpdate) => Promise<EditorBackgroundSaveResult>;
}

/** Choosing an image while Off shows it at this tier. */
const FIRST_VISIBLE_OPACITY = 50;

/**
 * Background state with optimistic tier changes. A failed save restores the
 * last stored state; only the newest request may apply its reply.
 */
export function useEditorBackground(config: EditorBackgroundConfig) {
  const { save } = config;
  const [state, setState] = useState(config.initial);
  const [pending, setPending] = useState(false);
  const stored = useRef(config.initial);
  const latest = useRef(0);

  const apply = useCallback(
    async (update: EditorBackgroundUpdate) => {
      const request = ++latest.current;
      if (update.opacity !== undefined) {
        const opacity = update.opacity;
        setState((current) => ({ ...current, opacity }));
      }
      setPending(true);

      let result: EditorBackgroundSaveResult;
      try {
        result = await save(update);
      } catch {
        result = { ok: false, message: "The background was not saved." };
      }
      if (request !== latest.current) return result;

      setPending(false);
      if (result.ok) {
        stored.current = result.background;
        setState(result.background);
      } else {
        setState(stored.current);
      }
      return result;
    },
    [save],
  );

  return { state, pending, apply };
}

/**
 * The fixed image layer behind the edit view. Its presence switches the admin
 * canvas and the marked panels to glass; see `globals.css`. Rendered on the
 * server, so the first paint already shows it.
 */
export function EditorBackdrop({ state }: { state: EditorBackgroundState }) {
  if (!state.image || state.opacity === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-muted"
      data-editor-backdrop={state.opacity}
    >
      <img
        alt=""
        className="size-full object-cover"
        decoding="async"
        sizes="100vw"
        src={state.image.src}
        srcSet={state.image.srcSet}
        style={{ opacity: state.opacity / 100 }}
      />
    </div>
  );
}

type View =
  | { kind: "main" }
  | { kind: "library"; items: LibraryImage[] | null }
  | { kind: "uploading"; fileName: string };

/** Header control: choose, upload, or remove the image, and pick a tier. */
export function EditorBackgroundControl({
  state,
  pending,
  opacities,
  apply,
  imageUpload,
}: {
  state: EditorBackgroundState;
  pending: boolean;
  opacities: readonly number[];
  apply: (
    update: EditorBackgroundUpdate,
  ) => Promise<EditorBackgroundSaveResult>;
  imageUpload?: ImageUploadConfig;
}) {
  const [view, setView] = useState<View>({ kind: "main" });
  const [error, setError] = useState<string | null>(null);
  const loadLibrary = imageUpload?.loadLibrary;

  async function choose(mediaId: string) {
    setError(null);
    const result = await apply({
      mediaId,
      ...(state.opacity === 0 ? { opacity: FIRST_VISIBLE_OPACITY } : {}),
    });
    if (result.ok) setView({ kind: "main" });
    else setError(result.message);
  }

  async function openLibrary() {
    if (!loadLibrary) return;
    setError(null);
    setView({ kind: "library", items: null });
    try {
      const items = await loadLibrary();
      setView((current) =>
        current.kind === "library" ? { kind: "library", items } : current,
      );
    } catch {
      setView({ kind: "main" });
      setError("The library could not be loaded.");
    }
  }

  async function upload(file: File) {
    if (!imageUpload) return;
    setError(null);
    setView({ kind: "uploading", fileName: file.name });
    // Decorative: a background carries no alt text.
    const result = await uploadImage(imageUpload, file, "");
    if (!result.ok) {
      setView({ kind: "main" });
      setError(result.message);
      return;
    }
    await choose(result.mediaId);
    setView({ kind: "main" });
  }

  async function setOpacity(opacity: number) {
    setError(null);
    const result = await apply({ opacity });
    if (!result.ok) toast(result.message);
  }

  async function remove() {
    setError(null);
    const result = await apply({ mediaId: null });
    if (!result.ok) setError(result.message);
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open && view.kind === "library") setView({ kind: "main" });
      }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                aria-label="Background"
                className="text-muted-foreground"
                size="icon"
                type="button"
                variant="ghost"
              >
                <Wallpaper />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Background</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="end" className="w-80 p-3">
        {view.kind === "library" ? (
          <LibraryGrid
            items={view.items}
            onBack={() => setView({ kind: "main" })}
            onPick={(image) => void choose(image.id)}
            selectedId={state.image?.mediaId ?? null}
          />
        ) : (
          <div className="space-y-3">
            <div className="relative aspect-video overflow-hidden rounded-control bg-muted ring-1 ring-border">
              {state.image ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  src={state.image.thumbnailUrl}
                />
              ) : (
                <span className="flex size-full flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <ImageOff aria-hidden className="size-5 text-faint" />
                  No background
                </span>
              )}
              {pending || view.kind === "uploading" ? (
                <span
                  className="absolute inset-0 flex items-center justify-center bg-background/60"
                  role="status"
                >
                  <LoaderCircle
                    aria-hidden
                    className="size-5 motion-safe:animate-spin"
                  />
                  <span className="sr-only">
                    {view.kind === "uploading" ? "Uploading" : "Saving"}
                  </span>
                </span>
              ) : null}
            </div>

            <div
              aria-label="Visibility"
              className="flex rounded-control bg-foreground/5 p-0.5"
              role="radiogroup"
            >
              {opacities.map((opacity) => {
                const checked = state.opacity === opacity;
                return (
                  <button
                    aria-checked={checked}
                    className={cn(
                      "h-8 flex-1 rounded-mark text-xs font-medium tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-40",
                      checked
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    disabled={!state.image}
                    key={opacity}
                    onClick={() => void setOpacity(opacity)}
                    role="radio"
                    type="button"
                  >
                    {opacity === 0 ? "Off" : `${opacity}%`}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              {imageUpload ? (
                <label
                  className={buttonVariants({
                    variant: "outline",
                    className: cn(
                      "flex-1 cursor-pointer has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50",
                      view.kind === "uploading" &&
                        "pointer-events-none opacity-50",
                    ),
                  })}
                >
                  <input
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    className="sr-only"
                    disabled={view.kind === "uploading"}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      // Cleared so choosing the same file again fires a change.
                      event.target.value = "";
                      if (file) void upload(file);
                    }}
                    type="file"
                  />
                  <Upload aria-hidden className="size-4" />
                  Upload
                </label>
              ) : null}
              {loadLibrary ? (
                <Button
                  className="flex-1"
                  disabled={view.kind === "uploading"}
                  onClick={() => void openLibrary()}
                  type="button"
                  variant="outline"
                >
                  <Images />
                  Library
                </Button>
              ) : null}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Remove background"
                      className="text-muted-foreground"
                      disabled={!state.image || view.kind === "uploading"}
                      onClick={() => void remove()}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove background</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function LibraryGrid({
  items,
  selectedId,
  onPick,
  onBack,
}: {
  items: LibraryImage[] | null;
  selectedId: string | null;
  onPick: (image: LibraryImage) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <Button
          aria-label="Back"
          className="-ml-1 text-muted-foreground"
          onClick={onBack}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <ArrowLeft />
        </Button>
        <p className="text-sm font-medium">Library</p>
      </div>
      {items === null ? (
        <p
          className="flex items-center gap-2 py-6 text-sm text-muted-foreground"
          role="status"
        >
          <LoaderCircle
            aria-hidden
            className="size-4 motion-safe:animate-spin"
          />
          Loading
        </p>
      ) : items.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">No images yet.</p>
      ) : (
        <ul className="mt-2 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto p-0.5">
          {items.map((image) => (
            <li key={image.id}>
              <button
                aria-label={`Use ${image.alt || "image without alt text"}`}
                aria-pressed={image.id === selectedId}
                className="block w-full overflow-hidden rounded-control ring-1 ring-border transition hover:ring-2 hover:ring-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:ring-2 aria-pressed:ring-foreground"
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
    </div>
  );
}
