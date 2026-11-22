"use client";

import { Check, Plus, X } from "lucide-react";
import { useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TagPickerProps {
  /** Form field that carries the comma-separated names. */
  name: string;
  /** Comma-separated names, as the server returns them. */
  defaultValue: string;
  /** Every tag name in the library. */
  suggestions: readonly string[];
  limit: number;
  invalid?: boolean;
  describedBy?: string;
}

// Same separators the server accepts in `parseTagNames`.
const SEPARATOR = /[,，、]/u;

function splitNames(raw: string): string[] {
  return raw
    .split(SEPARATOR)
    .map((part) => part.replace(/\s+/gu, " ").trim())
    .filter((part) => part !== "");
}

const sameName = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;

/**
 * Chips plus a searchable library popover. Picks existing tags or creates new
 * names; the server still parses, validates, and creates tags from the field.
 */
export function TagPicker({
  name,
  defaultValue,
  suggestions,
  limit,
  invalid,
  describedBy,
}: TagPickerProps) {
  const [tags, setTags] = useState(() => splitNames(defaultValue));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const draft = query.replace(/\s+/gu, " ").trim();
  const isChosen = (tag: string) =>
    tags.some((chosen) => sameName(chosen, tag));
  const canCreate =
    draft !== "" &&
    !SEPARATOR.test(draft) &&
    !suggestions.some((tag) => sameName(tag, draft)) &&
    !isChosen(draft);
  const full = tags.length >= limit;

  function toggle(tag: string) {
    if (isChosen(tag)) {
      setTags(tags.filter((chosen) => !sameName(chosen, tag)));
    } else if (!full) {
      setTags([...tags, tag]);
    }
    setQuery("");
  }

  return (
    <div
      aria-describedby={describedBy}
      aria-invalid={invalid}
      className="flex flex-wrap items-center gap-1.5"
    >
      {tags.map((tag) => (
        <span
          className="flex h-7 items-center gap-0.5 rounded-md bg-stone-100 pr-0.5 pl-2 text-sm text-stone-800"
          key={tag}
        >
          {tag}
          <button
            aria-label={`Remove ${tag}`}
            className="flex size-6 items-center justify-center rounded text-stone-400 hover:bg-stone-200 hover:text-stone-900"
            onClick={() => toggle(tag)}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}

      <Popover
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
        open={open}
      >
        <PopoverTrigger asChild>
          <button
            aria-label="Add tag"
            className={cn(
              "flex h-7 items-center gap-1 rounded-md border border-dashed border-stone-300 px-2 text-sm text-stone-500 hover:border-stone-400 hover:text-stone-900",
              invalid && "border-red-700 text-red-700",
            )}
            disabled={full}
            type="button"
          >
            <Plus className="size-3.5" />
            {tags.length === 0 ? "Tag" : null}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0">
          <Command>
            <CommandInput
              onValueChange={setQuery}
              placeholder="Search or create…"
              value={query}
            />
            <CommandList>
              {canCreate ? null : <CommandEmpty>No matching tags</CommandEmpty>}
              <CommandGroup heading="Tags">
                {suggestions.map((tag) => (
                  <CommandItem
                    disabled={full && !isChosen(tag)}
                    key={tag}
                    onSelect={() => toggle(tag)}
                    value={tag}
                  >
                    <Check
                      className={cn(
                        "!text-stone-900",
                        isChosen(tag) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {tag}
                  </CommandItem>
                ))}
              </CommandGroup>
              {canCreate && !full ? (
                // Own group, force-mounted: cmdk hides a group whose filtered
                // items are empty, and the new name never matches the library.
                <CommandGroup forceMount heading="New tag">
                  <CommandItem
                    forceMount
                    onSelect={() => toggle(draft)}
                    value={`create:${draft}`}
                  >
                    <Plus />
                    {draft}
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <input name={name} readOnly type="hidden" value={tags.join(", ")} />
    </div>
  );
}
