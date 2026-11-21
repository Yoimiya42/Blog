"use client";

import {
  useRef,
  useState,
  type MouseEvent,
  type PropsWithChildren,
} from "react";

/** `children` is the inline image the reader selects. */
export type ImageZoomProps = PropsWithChildren<{
  /** Largest useful variant; also the no-script link target. */
  src: string;
  srcSet?: string;
  alt: string;
  width: number;
  height: number;
}>;

/**
 * Select to enlarge (FR-BLOG-07). Without JavaScript the link opens the large
 * image, so enlargement never depends on hydration. The modal dialog supplies
 * Escape, the focus trap, and the inert page.
 */
export function ImageZoom({
  src,
  srcSet,
  alt,
  width,
  height,
  children,
}: ImageZoomProps) {
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The large copy mounts on first open, so the server markup carries one
  // image per node and nothing extra loads until a reader asks for it.
  const [zoomed, setZoomed] = useState(false);

  function open(event: MouseEvent<HTMLAnchorElement>) {
    const dialog = dialogRef.current;
    // Modified clicks keep the browser's own behaviour, such as a new tab.
    if (!dialog || event.metaKey || event.ctrlKey || event.shiftKey) return;

    event.preventDefault();
    setZoomed(true);
    dialog.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <a
        aria-label={alt ? `Enlarge image: ${alt}` : "Enlarge image"}
        data-image-zoom=""
        href={src}
        onClick={open}
        ref={triggerRef}
      >
        {children}
      </a>
      <dialog
        aria-label={alt || "Enlarged image"}
        data-image-zoom-dialog=""
        // Browsers differ on where focus lands after `close()`; return it to
        // the image the reader selected.
        onClose={() => triggerRef.current?.focus()}
        // Selecting the image or the backdrop closes the view too.
        onClick={close}
        ref={dialogRef}
      >
        <button
          // First focusable element, so `showModal()` focuses it.
          aria-label="Close enlarged image"
          data-image-zoom-close=""
          onClick={close}
          type="button"
        >
          Close
        </button>
        {zoomed ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021).
          <img
            alt={alt}
            height={height}
            sizes="95vw"
            src={src}
            srcSet={srcSet}
            width={width}
          />
        ) : null}
      </dialog>
    </>
  );
}
