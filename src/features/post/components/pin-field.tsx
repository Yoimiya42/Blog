"use client";

import { Pin } from "lucide-react";
import { useId, useState } from "react";

import { Switch } from "@/components/ui/switch";

/**
 * Pin switch in the settings sidebar (FR-ADMIN-29). Like the cover, the pin
 * saves with the post, so its value travels in a hidden input.
 */
export function PinField({
  initial,
  error,
  onChange,
}: {
  initial: boolean;
  error?: string;
  /** Called after the hidden input changes, for the dirty state. */
  onChange: () => void;
}) {
  const [pinned, setPinned] = useState(initial);
  const id = useId();

  return (
    <div className="p-4">
      <input name="pinned" type="hidden" value={pinned ? "true" : "false"} />
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
          onCheckedChange={(checked) => {
            setPinned(checked);
            onChange();
          }}
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
