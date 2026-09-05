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

  return (
    <button aria-live="polite" onClick={handleCopy} type="button">
      {copied ? "Copied" : "Copy code"}
    </button>
  );
}
