"use client";

import { useState, useEffect } from "react";

const COPY_FEEDBACK_MS = 2000;

export type CopyCodeButtonProps = {
  code: string;
};

export function CopyCodeButton({ code }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, COPY_FEEDBACK_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  // Icon only; the visually hidden text is the accessible name and the
  // live announcement.
  return (
    <button
      aria-live="polite"
      data-code-copy=""
      onClick={handleCopy}
      title={copied ? "Copied" : "Copy code"}
      type="button"
    >
      <svg
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        {copied ? (
          <path d="M20 6 9 17l-5-5" />
        ) : (
          <>
            <rect height="14" rx="2" width="14" x="8" y="8" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </>
        )}
      </svg>
      <span className="sr-only">{copied ? "Copied" : "Copy code"}</span>
    </button>
  );
}
