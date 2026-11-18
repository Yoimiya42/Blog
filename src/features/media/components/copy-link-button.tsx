"use client";

import { useState } from "react";

interface CopyLinkButtonProps {
  /** Root-relative URL; the copied link uses the current origin. */
  url: string;
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        new URL(url, window.location.origin).toString(),
      );
      setState("copied");
    } catch {
      // Clipboard access can be denied; the link stays visible to select.
      setState("failed");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-100"
        onClick={() => void copy()}
        type="button"
      >
        Copy link
      </button>
      <span aria-live="polite" className="text-sm text-stone-600">
        {state === "copied"
          ? "Copied."
          : state === "failed"
            ? "Copy failed. Select the link instead."
            : ""}
      </span>
    </span>
  );
}
