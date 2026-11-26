"use client";

import { Folder } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

// Type only: the category index also exports server modules.
import type { Category } from "@/features/category";

/**
 * Category choice in the publish dialog (FR-BLOG-18). The list comes from
 * settings (FR-ADMIN-30). Native radios, so the group is one tab stop with
 * arrow-key selection. Controlled: the form carries the id in a hidden input.
 */
export function CategoryField({
  categories,
  value,
  error,
  onChange,
}: {
  categories: readonly Category[];
  value: string;
  error?: string;
  onChange: (categoryId: string) => void;
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
        {categories.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted-foreground">
            No categories yet.{" "}
            <Link
              className="underline underline-offset-2"
              href="/admin/settings"
            >
              Add them in Settings
            </Link>
            .
          </p>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <ChoiceChip
                checked={value === category.id}
                key={category.id}
                label={category.name}
                name={`${id}-category`}
                onChange={() => onChange(category.id)}
                value={category.id}
              />
            ))}
          </div>
        )}
        <ErrorText id={`${id}-error`} message={error} />
      </fieldset>
    </div>
  );
}

/** A native radio styled as a chip, shared by the category and language. */
export function ChoiceChip({
  checked,
  label,
  name,
  value,
  lang,
  title,
  onChange,
}: {
  checked: boolean;
  label: string;
  name: string;
  value: string;
  lang?: string;
  title?: string;
  onChange: () => void;
}) {
  return (
    <label
      className="cursor-pointer rounded-full border border-border px-3 py-1 text-sm text-muted-foreground has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-2 has-focus-visible:ring-ring"
      lang={lang}
      title={title}
    >
      <input
        checked={checked}
        className="sr-only"
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
      />
      {label}
    </label>
  );
}

export function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-2 text-sm text-destructive" id={id} role="alert">
      {message}
    </p>
  );
}
