/* eslint-disable @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021). */

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

/** Owner-only list, newest first. Coordinates appear only as a flag. */
export function MediaLibrary({ items }: { items: MediaLibraryItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-stone-600">
        No media. Upload images from the post editor.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-stone-200">
      {items.map((item) => (
        <li
          className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start"
          key={item.id}
        >
          <a
            className="block shrink-0"
            href={item.url}
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt={item.alt}
              className="h-auto w-full rounded-lg bg-stone-100 object-contain sm:h-32 sm:w-48"
              decoding="async"
              height={item.height}
              loading="lazy"
              src={item.thumbnailUrl}
              width={item.width}
            />
          </a>
          <div className="min-w-0 flex-1 space-y-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-stone-500">Uploaded</dt>
              <dd>
                <time dateTime={item.createdAt.toISOString()}>
                  {DATE_FORMAT.format(item.createdAt)}
                </time>
              </dd>
              <dt className="text-stone-500">Size</dt>
              <dd>
                {item.width} × {item.height} ·{" "}
                {item.mimeType.replace("image/", "").toUpperCase()} ·{" "}
                {formatSize(item.sizeBytes)}
              </dd>
              <dt className="text-stone-500">Alt text</dt>
              <dd className="break-words">
                {item.alt || (
                  <span className="text-stone-500">None (decorative)</span>
                )}
              </dd>
              {item.hadLocation ? (
                <>
                  <dt className="text-stone-500">Location</dt>
                  <dd>Removed from the served file; kept privately.</dd>
                </>
              ) : null}
              <dt className="text-stone-500">Link</dt>
              <dd className="font-mono text-xs leading-5 break-all">
                {item.url}
              </dd>
            </dl>
            <div className="flex flex-wrap items-start gap-3">
              <CopyLinkButton url={item.url} />
              <DeleteMediaButton mediaId={item.id} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
