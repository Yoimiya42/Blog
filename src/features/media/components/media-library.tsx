"use client";

/* eslint-disable @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021). */

import { ExternalLink, ImageOff, MapPinOff } from "lucide-react";
import { useCallback, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

import type { MediaLibraryItem } from "../server/media.service";
import { CopyLinkButton } from "./copy-link-button";
import { DeleteMediaButton } from "./delete-media-button";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Owner-only thumbnail grid, newest first (FR-ADMIN-21). Opening an item shows
 * its details and actions. Coordinates appear only as a flag.
 */
export function MediaLibrary({ items }: { items: MediaLibraryItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);
  const selected = items.find((item) => item.id === openId) ?? null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-input py-16 text-center">
        <ImageOff aria-hidden className="size-6 text-faint" />
        <p className="text-sm text-muted-foreground">
          No images yet. Upload from the post editor.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <button
              aria-label={`Open ${item.alt || "image without alt text"}`}
              className="group block w-full overflow-hidden rounded-container bg-card ring-1 ring-border transition hover:ring-faint focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => setOpenId(item.id)}
              type="button"
            >
              <img
                alt=""
                className="aspect-square w-full bg-muted object-cover"
                decoding="async"
                height={item.height}
                loading="lazy"
                src={item.thumbnailUrl}
                width={item.width}
              />
              <span className="block truncate px-2.5 py-2 text-left text-xs text-muted-foreground">
                {item.alt || "No alt text"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        onOpenChange={(open) => {
          if (!open) close();
        }}
        open={selected !== null}
      >
        {selected ? (
          <DialogContent className="max-w-2xl overflow-hidden p-0">
            <MediaDetail item={selected} onDeleted={close} />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

function MediaDetail({
  item,
  onDeleted,
}: {
  item: MediaLibraryItem;
  onDeleted: () => void;
}) {
  return (
    <div className="grid sm:grid-cols-[minmax(0,1fr)_16rem]">
      {/* The dialog clips its corners, so the panel needs no radius. */}
      <div className="flex items-center justify-center bg-muted p-4">
        <img
          alt={item.alt}
          className="max-h-96 w-auto rounded-control object-contain"
          decoding="async"
          height={item.height}
          src={item.url}
          width={item.width}
        />
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="pr-8">
          <DialogTitle className="break-words">
            {item.alt || "No alt text"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            <time dateTime={item.createdAt.toISOString()}>
              {DATE_FORMAT.format(item.createdAt)}
            </time>
          </DialogDescription>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Size</dt>
          <dd>
            {item.width} × {item.height}
          </dd>
          <dt className="text-muted-foreground">File</dt>
          <dd>
            {item.mimeType.replace("image/", "").toUpperCase()} ·{" "}
            {formatSize(item.sizeBytes)}
          </dd>
          <dt className="text-muted-foreground">Link</dt>
          <dd className="font-mono text-xs leading-5 break-all">{item.url}</dd>
        </dl>

        {item.hadLocation ? (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPinOff aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            Location removed from the served file; kept privately.
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2">
          <CopyLinkButton url={item.url} />
          <a
            aria-label="Open image in a new tab"
            className={buttonVariants({ variant: "outline", size: "icon" })}
            href={item.url}
            rel="noreferrer"
            target="_blank"
            title="Open in a new tab"
          >
            <ExternalLink />
          </a>
        </div>
        <div className="border-t border-border pt-3">
          <DeleteMediaButton mediaId={item.id} onDeleted={onDeleted} />
        </div>
      </div>
    </div>
  );
}
