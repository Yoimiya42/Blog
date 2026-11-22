"use client";

import { Check } from "lucide-react";
import type { MouseEvent } from "react";

import { cn } from "@/lib/utils";

import type { CodeLanguage } from "../types";
import { CODE_LANGUAGE_OPTIONS } from "../code-languages";
import { LanguageIcon } from "../language-icons";

/** Language list shared by the toolbar's insert menu and a block's header. */
export function CodeLanguageMenu({
  current,
  onPick,
}: {
  /** Marked with a check; omitted when inserting a new block. */
  current?: string;
  onPick: (language: CodeLanguage) => void;
}) {
  return (
    <div aria-label="Code language" className="flex flex-col" role="menu">
      {CODE_LANGUAGE_OPTIONS.map(({ value, label }) => (
        <button
          className={cn(
            "flex h-8 items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
          )}
          key={value}
          onClick={() => onPick(value)}
          // Keep the editor selection while the menu is used.
          onMouseDown={(event: MouseEvent) => event.preventDefault()}
          role="menuitemradio"
          aria-checked={current === value}
          type="button"
        >
          <LanguageIcon className="text-stone-500" language={value} />
          <span className="flex-1">{label}</span>
          <Check
            aria-hidden
            className={cn(
              "size-4",
              current === value ? "opacity-100" : "opacity-0",
            )}
          />
        </button>
      ))}
    </div>
  );
}
