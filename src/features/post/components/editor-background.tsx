"use client";

/* eslint-disable @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021). */

import {
  ArrowLeft,
  ImageOff,
  Images,
  LoaderCircle,
  RotateCcw,
  Trash2,
  Upload,
  Wallpaper,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

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

/** Mirrors the media module's background view (ADR-0031, ADR-0032). */
export interface EditorBackgroundState {
  /** `post` when the post has its own choice; absent for the default. */
  source?: "default" | "post";
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
 * (ADR-0024). `save` and `reset` are Server Actions that validate their input;
 * a post page binds them to the post (ADR-0032).
 */
export interface EditorBackgroundConfig {
  initial: EditorBackgroundState;
  /** Visibility tiers in percent, Off first. */
  opacities: readonly number[];
  save: (update: EditorBackgroundUpdate) => Promise<EditorBackgroundSaveResult>;
  /** Returns a post to the default. Absent on the settings page. */
  reset?: () => Promise<EditorBackgroundSaveResult>;
}

/** Choosing an image while Off shows it at this tier. */
const FIRST_VISIBLE_OPACITY = 50;

/**
 * Background state with optimistic tier changes. A failed save restores the
 * last stored state; only the newest request may apply its reply.
 */
export function useEditorBackground(config: EditorBackgroundConfig) {
  const { save, reset } = config;
  const [state, setState] = useState(config.initial);
  const [pending, setPending] = useState(false);
  const stored = useRef(config.initial);
  const latest = useRef(0);

  const run = useCallback(
    async (
      request: () => Promise<EditorBackgroundSaveResult>,
      optimisticOpacity?: number,
    ) => {
      const id = ++latest.current;
      if (optimisticOpacity !== undefined) {
        setState((current) => ({ ...current, opacity: optimisticOpacity }));
      }
      setPending(true);

      let result: EditorBackgroundSaveResult;
      try {
        result = await request();
      } catch {
        result = { ok: false, message: "The background was not saved." };
      }
      if (id !== latest.current) return result;

      setPending(false);
      if (result.ok) {
        stored.current = result.background;
        setState(result.background);
      } else {
        setState(stored.current);
      }
      return result;
    },
    [],
  );

  const apply = useCallback(
    (update: EditorBackgroundUpdate) => run(() => save(update), update.opacity),
    [run, save],
  );

  const resetToDefault = useMemo(
    () => (reset ? () => run(reset) : undefined),
    [reset, run],
  );

  return { state, pending, apply, reset: resetToDefault };
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

interface PanelProps {
  state: EditorBackgroundState;
  pending: boolean;
  opacities: readonly number[];
  apply: (
    update: EditorBackgroundUpdate,
  ) => Promise<EditorBackgroundSaveResult>;
  /** Present for a post: shows the source and Reset to default. */
  reset?: () => Promise<EditorBackgroundSaveResult>;
  imageUpload?: ImageUploadConfig;
}

/** Header control: the background panel in a popover (FR-ADMIN-26). */
export function EditorBackgroundControl(props: PanelProps) {
  // Bumped on close so the panel reopens on its main view.
  const [opened, setOpened] = useState(0);

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) setOpened((current) => current + 1);
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
        <EditorBackgroundPanel key={opened} {...props} />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Default background editor for the settings page (FR-ADMIN-27). Saves at
 * once; the page shows no backdrop, only the preview tile.
 */
export function EditorBackgroundSettings({
  config,
  imageUpload,
}: {
  config: EditorBackgroundConfig;
  imageUpload?: ImageUploadConfig;
}) {
  const background = useEditorBackground(config);

  return (
    <EditorBackgroundPanel
      apply={background.apply}
      imageUpload={imageUpload}
      opacities={config.opacities}
      pending={background.pending}
      state={background.state}
    />
  );
}

/** Choose, upload, or remove the image, and pick a tier. */
function EditorBackgroundPanel({
  state,
  pending,
  opacities,
  apply,
  reset,
  imageUpload,
}: PanelProps) {
  const [view, setView] = useState<View>({ kind: "main" });
  const [error, setError] = useState<string | null>(null);
  const loadLibrary = imageUpload?.loadLibrary;
  const busy = pending || view.kind === "uploading";

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

  async function resetToDefault() {
    if (!reset) return;
    setError(null);
    const result = await reset();
    if (!result.ok) setError(result.message);
  }

  if (view.kind === "library") {
    return (
      <LibraryGrid
        items={view.items}
        onBack={() => setView({ kind: "main" })}
        onPick={(image) => void choose(image.id)}
        selectedId={state.image?.mediaId ?? null}
      />
    );
  }

  return (
    <div className="space-y-3">
      {reset ? (
        <div className="flex min-h-8 items-center justify-between gap-2 text-xs text-muted-foreground">
          <span role="status">
            {state.source === "post" ? "This post" : "Using the default"}
          </span>
          {state.source === "post" ? (
            <Button
              className="-mr-2 h-8 text-xs"
              disabled={busy}
              onClick={() => void resetToDefault()}
              size="sm"
              type="button"
              variant="ghost"
            >
              <RotateCcw />
              Reset to default
            </Button>
          ) : null}
        </div>
      ) : null}

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
        {busy ? (
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
                view.kind === "uploading" && "pointer-events-none opacity-50",
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
