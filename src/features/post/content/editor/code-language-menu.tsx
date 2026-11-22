"use client";

import {
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { CODE_LANGUAGE_OPTIONS } from "../code-languages";
import { LanguageIcon } from "../language-icons";
import type { CodeLanguage } from "../types";

/**
 * Language list for a `DropdownMenu`, shared by the toolbar's insert control
 * and a block's header. Arrow keys and typeahead come from Radix.
 */
export function CodeLanguageMenuContent({
  current,
  onPick,
}: {
  /** The block's language; omitted when inserting a new block. */
  current?: string;
  onPick: (language: CodeLanguage) => void;
}) {
  return (
    <DropdownMenuContent
      align="start"
      aria-label="Code language"
      className="w-48"
      // The caller returns focus to the editor; Radix would move it to the
      // trigger afterwards and drop the editor selection.
      onCloseAutoFocus={(event) => event.preventDefault()}
    >
      <DropdownMenuLabel>Language</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup
        onValueChange={(value) => onPick(value as CodeLanguage)}
        value={current ?? ""}
      >
        {CODE_LANGUAGE_OPTIONS.map(({ value, label }) => (
          <DropdownMenuRadioItem key={value} textValue={label} value={value}>
            <LanguageIcon className="text-muted-foreground" language={value} />
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  );
}
