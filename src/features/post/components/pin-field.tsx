"use client";

import { Pin } from "lucide-react";
import { useId } from "react";

import { Switch } from "@/components/ui/switch";

/**
 * Pin switch in the publish dialog (FR-ADMIN-29). Controlled, like the cover:
 * the form carries the value in a hidden input.
 */
export function PinField({
  checked: pinned,
  error,
  onChange,
}: {
  checked: boolean;
  error?: string;
  onChange: (pinned: boolean) => void;
}) {
  const id = useId();

  return (
    <div className="p-4">
      <div className="flex min-h-9 items-center gap-3">
        <Pin aria-hidden className="size-4 shrink-0 text-faint" />
        <label
          className="flex-1 text-sm text-muted-foreground"
          htmlFor={`${id}-switch`}
        >
          Pinned
        </label>
        <Switch
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          checked={pinned}
          id={`${id}-switch`}
          onCheckedChange={onChange}
        />
      </div>
      {error ? (
        <p
          className="mt-2 text-sm text-destructive"
          id={`${id}-error`}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
