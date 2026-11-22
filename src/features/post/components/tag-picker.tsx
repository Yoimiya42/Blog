"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";

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
 * Chip input over the tag library. Picks existing tags or adds new names; the
 * server still parses, validates, and creates tags from the hidden field.
 */
export function TagPicker({
  name,
  defaultValue,
  suggestions,
  limit,
  invalid,
  describedBy,
}: TagPickerProps) {
  const listId = useId();
  const [tags, setTags] = useState(() => splitNames(defaultValue));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const trimmed = query.replace(/\s+/gu, " ").trim();
  const matches = useMemo(() => {
    const needle = trimmed.toLocaleLowerCase();
    return suggestions
      .filter((tag) => !tags.some((chosen) => sameName(chosen, tag)))
      .filter((tag) => tag.toLocaleLowerCase().includes(needle))
      .slice(0, 8);
  }, [suggestions, tags, trimmed]);
  const canCreate =
    trimmed !== "" &&
    !SEPARATOR.test(trimmed) &&
    !suggestions.some((tag) => sameName(tag, trimmed)) &&
    !tags.some((tag) => sameName(tag, trimmed));
  const options = canCreate ? [...matches, trimmed] : matches;
  const full = tags.length >= limit;

  function add(tag: string) {
    const value = tag.replace(/\s+/gu, " ").trim();
    if (value === "" || full) return;
    if (!tags.some((chosen) => sameName(chosen, value))) {
      setTags([...tags, value]);
    }
    setQuery("");
    setActive(0);
  }

  function remove(tag: string) {
    setTags(tags.filter((chosen) => chosen !== tag));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Composition keys belong to the input method, not to the picker.
    if (event.nativeEvent.isComposing) return;

    if (event.key === "ArrowDown" && options.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((active + 1) % options.length);
    } else if (event.key === "ArrowUp" && options.length > 0) {
      event.preventDefault();
      setActive((active - 1 + options.length) % options.length);
    } else if (event.key === "Enter" || event.key === ",") {
      // Enter must never submit the post form from here.
      event.preventDefault();
      const choice = open ? options[active] : undefined;
      add(choice ?? trimmed);
    } else if (event.key === "Backspace" && query === "" && tags.length > 0) {
      setTags(tags.slice(0, -1));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div
        aria-invalid={invalid}
        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-stone-200 bg-white p-1.5 focus-within:border-stone-400 aria-invalid:border-red-700"
      >
        {tags.map((tag) => (
          <span
            className="flex items-center gap-1 rounded-md bg-stone-100 py-0.5 pr-1 pl-2 text-sm text-stone-800"
            key={tag}
          >
            {tag}
            <button
              aria-label={`Remove ${tag}`}
              className="flex size-6 items-center justify-center rounded text-stone-500 hover:bg-stone-200 hover:text-stone-900"
              onClick={() => remove(tag)}
              type="button"
            >
              ×
            </button>
          </span>
        ))}
        <input
          aria-activedescendant={
            open && options.length > 0 ? `${listId}-${active}` : undefined
          }
          aria-autocomplete="list"
          aria-controls={listId}
          aria-describedby={describedBy}
          aria-expanded={open && options.length > 0}
          aria-label="Add tag"
          autoCapitalize="none"
          className="min-h-8 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-stone-400 disabled:cursor-not-allowed"
          disabled={full}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={full ? `Up to ${limit} tags` : "Add tag…"}
          role="combobox"
          type="text"
          value={query}
        />
      </div>

      {open && options.length > 0 ? (
        <ul
          className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-lg"
          id={listId}
          role="listbox"
        >
          {options.map((option, index) => {
            const created = canCreate && index === options.length - 1;
            return (
              <li
                aria-selected={index === active}
                className="flex min-h-9 cursor-pointer items-center rounded-md px-2 text-sm aria-selected:bg-stone-100"
                id={`${listId}-${index}`}
                key={created ? `new:${option}` : option}
                // Mouse down, not click: the input's blur would close the list first.
                onMouseDown={(event) => {
                  event.preventDefault();
                  add(option);
                }}
                onMouseEnter={() => setActive(index)}
                role="option"
              >
                {created ? (
                  <span>
                    <span className="text-stone-500">Create </span>“{option}”
                  </span>
                ) : (
                  option
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      <input name={name} readOnly type="hidden" value={tags.join(", ")} />
    </div>
  );
}
