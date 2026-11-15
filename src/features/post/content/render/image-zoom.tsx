"use client";

import { useRef, useState, type MouseEvent, type ReactNode } from "react";

export type ImageZoomProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  children: ReactNode;
};

/**
 * Click to enlarge (FR-BLOG-07). Without JavaScript the link opens the full
 * image, so enlargement never depends on hydration.
 */
export function ImageZoom({
  src,
  alt,
  width,
  height,
  children,
}: ImageZoomProps) {
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

  return (
    <>
      <a
        aria-label={alt ? `Enlarge image: ${alt}` : "Enlarge image"}
        data-image-zoom=""
        href={src}
        onClick={open}
      >
        {children}
      </a>
      <dialog
        aria-label={alt || "Enlarged image"}
        data-image-zoom-dialog=""
        onClick={() => dialogRef.current?.close()}
        ref={dialogRef}
      >
        {zoomed ? (
          // eslint-disable-next-line @next/next/no-img-element -- Issue #14 owns the responsive image pipeline.
          <img alt={alt} height={height} src={src} width={width} />
        ) : null}
        <p data-image-zoom-hint="">Click anywhere or press Esc to close.</p>
      </dialog>
    </>
  );
}
