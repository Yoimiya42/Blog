"use client";

import { Folder } from "lucide-react";
import { useId } from "react";

import { POST_CATEGORIES, POST_CATEGORY_NAMES } from "../schema";

/**
 * Category choice in the publish dialog (FR-BLOG-18). Native radios, so the
 * group is one tab stop with arrow-key selection. Controlled, like the pin:
 * the form carries the value in a hidden input.
 */
export function CategoryField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (category: string) => void;
}) {
  const id = useId();

  return (
    <div className="flex gap-3 p-4">
      <Folder aria-hidden className="mt-0.5 size-4 shrink-0 text-faint" />
      <fieldset
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        className="min-w-0 flex-1"
      >
        <legend className="text-sm text-muted-foreground">Category</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {POST_CATEGORIES.map((category) => (
            <label
              className="cursor-pointer rounded-full border border-border px-3 py-1 text-sm text-muted-foreground has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-2 has-focus-visible:ring-ring"
              key={category}
            >
              <input
                checked={value === category}
                className="sr-only"
                name={`${id}-category`}
                onChange={() => onChange(category)}
                type="radio"
                value={category}
              />
              {POST_CATEGORY_NAMES[category]}
            </label>
          ))}
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
      </fieldset>
    </div>
  );
}
