"use client";

import { Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface CopyLinkButtonProps {
  /** Root-relative URL; the copied link uses the current origin. */
  url: string;
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        new URL(url, window.location.origin).toString(),
      );
      toast("Link copied");
    } catch {
      // Clipboard access can be denied; the link stays visible to select.
      toast("Copy failed. Select the link instead.", "error");
    }
  }

  return (
    <Button onClick={() => void copy()} type="button" variant="outline">
      <Link2 />
      Copy link
    </Button>
  );
}
