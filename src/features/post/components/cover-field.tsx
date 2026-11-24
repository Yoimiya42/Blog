"use client";
/* eslint-disable @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021). */

import {
  ImageIcon,
  ImageOff,
  Images,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { ImageUploadConfig, LibraryImage } from "../content/image-upload";
import { ACCEPTED_IMAGE_TYPES, uploadImage } from "../content/upload-image";
import { LibraryGrid } from "./editor-background";

/** The stored cover as the editor shows it (FR-ADMIN-28). */
export interface CoverValue {
  mediaId: string;
  /** Null when the image was deleted from the library. */
  thumbnailUrl: string | null;
}

type View =
  | { kind: "main" }
  | { kind: "library"; items: LibraryImage[] | null }
  | { kind: "uploading" };

/**
 * Cover picker in the settings sidebar. The choice is a form field: it saves
 * with the post, so `coverId` travels in a hidden input.
 */
export function CoverField({
  initial,
  imageUpload,
  error,
  onChange,
}: {
  initial: CoverValue | null;
  imageUpload?: ImageUploadConfig;
  error?: string;
  /** Called after the hidden input changes, for the dirty state. */
  onChange: () => void;
}) {
  const [cover, setCover] = useState(initial);
  const [view, setView] = useState<View>({ kind: "main" });
  const [message, setMessage] = useState<string | null>(null);
  const loadLibrary = imageUpload?.loadLibrary;

  function choose(next: CoverValue | null) {
    setCover(next);
    setView({ kind: "main" });
    setMessage(null);
    onChange();
  }

  async function openLibrary() {
    if (!loadLibrary) return;
    setMessage(null);
    setView({ kind: "library", items: null });
    try {
      const items = await loadLibrary();
      setView((current) =>
        current.kind === "library" ? { kind: "library", items } : current,
      );
    } catch {
      setView({ kind: "main" });
      setMessage("The library could not be loaded.");
    }
  }

  async function upload(file: File) {
    if (!imageUpload) return;
    setMessage(null);
    setView({ kind: "uploading" });
    // A list cover sits beside the title, so it is decorative.
    const result = await uploadImage(imageUpload, file, "");
    if (!result.ok) {
      setView({ kind: "main" });
      setMessage(result.message);
      return;
    }
    // The upload response carries the article-width URL, which also serves
    // as the preview.
    choose({ mediaId: result.mediaId, thumbnailUrl: result.url });
  }

  const shown = message ?? error;

  return (
    <div className="p-4">
      <input name="coverId" type="hidden" value={cover?.mediaId ?? ""} />

      {view.kind === "library" ? (
        <LibraryGrid
          items={view.items}
          onBack={() => setView({ kind: "main" })}
          onPick={(image) =>
            choose({ mediaId: image.id, thumbnailUrl: image.thumbnailUrl })
          }
          selectedId={cover?.mediaId ?? null}
        />
      ) : (
        <TooltipProvider>
          <div className="flex min-h-9 items-center gap-3">
            <ImageIcon aria-hidden className="size-4 shrink-0 text-faint" />
            <span className="flex-1 text-sm text-muted-foreground">Cover</span>
            {imageUpload ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <label
                    className={buttonVariants({
                      variant: "ghost",
                      size: "icon-sm",
                      className: cn(
                        "cursor-pointer text-muted-foreground has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50",
                        view.kind === "uploading" &&
                          "pointer-events-none opacity-50",
                      ),
                    })}
                  >
                    <input
                      accept={ACCEPTED_IMAGE_TYPES.join(",")}
                      aria-label="Upload cover"
                      className="sr-only"
                      disabled={view.kind === "uploading"}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        // Cleared so choosing the same file again fires.
                        event.target.value = "";
                        if (file) void upload(file);
                      }}
                      type="file"
                    />
                    <Upload aria-hidden />
                  </label>
                </TooltipTrigger>
                <TooltipContent>Upload cover</TooltipContent>
              </Tooltip>
            ) : null}
            {loadLibrary ? (
              <IconAction
                disabled={view.kind === "uploading"}
                icon={Images}
                label="Choose from library"
                onClick={() => void openLibrary()}
              />
            ) : null}
            {cover ? (
              <IconAction
                disabled={view.kind === "uploading"}
                icon={Trash2}
                label="Remove cover"
                onClick={() => choose(null)}
              />
            ) : null}
          </div>

          {cover || view.kind === "uploading" ? (
            <div className="relative mt-2 aspect-[16/10] overflow-hidden rounded-control bg-muted ring-1 ring-border">
              {cover?.thumbnailUrl ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  decoding="async"
                  src={cover.thumbnailUrl}
                />
              ) : cover ? (
                <span className="flex size-full flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ImageOff aria-hidden className="size-4 text-faint" />
                  Image deleted
                </span>
              ) : null}
              {view.kind === "uploading" ? (
                <span
                  className="absolute inset-0 flex items-center justify-center bg-background/60"
                  role="status"
                >
                  <LoaderCircle
                    aria-hidden
                    className="size-5 motion-safe:animate-spin"
                  />
                  <span className="sr-only">Uploading</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </TooltipProvider>
      )}

      {shown ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {shown}
        </p>
      ) : null}
    </div>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Images;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          className="text-muted-foreground"
          disabled={disabled}
          onClick={onClick}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
