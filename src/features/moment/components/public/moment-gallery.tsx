"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

import type { MomentImage } from "../../server/moment.service";

/** Horizontal travel, in CSS pixels, that counts as a swipe. */
const SWIPE_DISTANCE = 48;

function gridVariant(count: number): "single" | "square" | "triple" {
  if (count === 1) return "single";
  // Four images read as a 2×2 block, like two pairs, not a broken row.
  if (count === 2 || count === 4) return "square";
  return "triple";
}

/**
 * Image grid with an enlarged view (FR-MOMENT-02). Each cell links to the
 * large variant, so enlargement works without JavaScript. The modal dialog
 * supplies Escape, the focus trap, and the inert page.
 */
export function MomentGallery({ images }: { images: MomentImage[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggers = useRef<(HTMLAnchorElement | null)[]>([]);
  // Null until the first open, so no large image loads before it is asked for.
  const [index, setIndex] = useState<number | null>(null);
  const swipeStart = useRef<number | null>(null);

  if (images.length === 0) return null;

  const variant = gridVariant(images.length);
  const current = index === null ? null : images[index];
  const many = images.length > 1;

  function open(event: MouseEvent<HTMLAnchorElement>, at: number) {
    const dialog = dialogRef.current;
    // Modified clicks keep the browser's own behaviour, such as a new tab.
    if (!dialog || event.metaKey || event.ctrlKey || event.shiftKey) return;

    event.preventDefault();
    setIndex(at);
    dialog.showModal();
  }

  function step(delta: number) {
    setIndex((at) =>
      at === null ? at : (at + delta + images.length) % images.length,
    );
  }

  function close() {
    dialogRef.current?.close();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "ArrowLeft") step(-1);
    else if (event.key === "ArrowRight") step(1);
  }

  function onPointerUp(event: PointerEvent<HTMLDialogElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start === null || !many) return;

    const distance = event.clientX - start;
    if (Math.abs(distance) >= SWIPE_DISTANCE) step(distance < 0 ? 1 : -1);
  }

  return (
    <>
      <ul className="moment-grid" data-variant={variant}>
        {images.map((image, at) => (
          <li key={image.id}>
            <a
              aria-label={
                many
                  ? `Enlarge image ${at + 1} of ${images.length}`
                  : "Enlarge image"
              }
              href={image.zoomUrl}
              onClick={(event) => open(event, at)}
              ref={(element) => {
                triggers.current[at] = element;
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021). */}
              <img
                alt={image.alt}
                decoding="async"
                height={image.height}
                loading="lazy"
                sizes={
                  variant === "single"
                    ? "(min-width: 40rem) 36rem, 100vw"
                    : "(min-width: 40rem) 12rem, 33vw"
                }
                src={image.url}
                srcSet={image.srcSet}
                width={image.width}
              />
            </a>
          </li>
        ))}
      </ul>

      <dialog
        aria-label="Images"
        className="moment-viewer"
        // Browsers differ on where focus lands after `close()`; return it to
        // the image the reader last saw.
        onClose={() => {
          if (index !== null) triggers.current[index]?.focus();
        }}
        onClick={(event) => {
          // The backdrop and the empty stage close; controls do not.
          if (event.target === event.currentTarget) close();
        }}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          swipeStart.current = event.clientX;
        }}
        onPointerUp={onPointerUp}
        ref={dialogRef}
      >
        <button
          // First focusable element, so `showModal()` focuses it.
          aria-label="Close"
          className="moment-viewer__close"
          onClick={close}
          type="button"
        >
          <X aria-hidden="true" />
        </button>

        {current ? (
          <figure className="moment-viewer__stage" onClick={close}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021). */}
            <img
              alt={current.alt}
              height={current.height}
              key={current.id}
              sizes="95vw"
              src={current.zoomUrl}
              srcSet={current.srcSet}
              width={current.width}
            />
          </figure>
        ) : null}

        {many && index !== null ? (
          <>
            <button
              aria-label="Previous image"
              className="moment-viewer__nav"
              data-side="prev"
              onClick={() => step(-1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              aria-label="Next image"
              className="moment-viewer__nav"
              data-side="next"
              onClick={() => step(1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <p aria-live="polite" className="moment-viewer__count">
              {index + 1} / {images.length}
            </p>
          </>
        ) : null}
      </dialog>
    </>
  );
}
