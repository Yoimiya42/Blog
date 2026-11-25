"use client";

import { Languages } from "lucide-react";
import { useId } from "react";

import {
  POST_LANGUAGE_LABELS,
  POST_LANGUAGES,
  type PostLanguage,
} from "../schema";
import { ChoiceChip, ErrorText } from "./category-field";

/** A post this one may name as its original (ADR-0038). */
export interface TranslationTarget {
  id: string;
  title: string;
  language: PostLanguage | null;
}

const SELECT_CLASS =
  "h-9 w-full rounded-control border border-border bg-background px-2 text-sm outline-none focus:border-faint aria-invalid:border-destructive";

/**
 * Content language and translation link in the publish dialog (FR-BLOG-22).
 * Controlled, like the category: the form carries both in hidden inputs.
 */
export function LanguageField({
  language,
  translationOf,
  targets,
  languageError,
  translationError,
  onChange,
}: {
  language: string;
  translationOf: string;
  targets: readonly TranslationTarget[];
  languageError?: string;
  translationError?: string;
  onChange: (patch: { language?: string; translationOf?: string }) => void;
}) {
  const id = useId();

  return (
    <div className="flex gap-3 p-4">
      <Languages aria-hidden className="mt-0.5 size-4 shrink-0 text-faint" />
      <div className="min-w-0 flex-1 space-y-4">
        <fieldset
          aria-describedby={languageError ? `${id}-language-error` : undefined}
          aria-invalid={languageError ? true : undefined}
        >
          <legend className="text-sm text-muted-foreground">Language</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {POST_LANGUAGES.map((code) => (
              <ChoiceChip
                checked={language === code}
                key={code}
                label={POST_LANGUAGE_LABELS[code].name}
                lang={code}
                name={`${id}-language`}
                onChange={() => onChange({ language: code })}
                value={code}
              />
            ))}
          </div>
          <ErrorText id={`${id}-language-error`} message={languageError} />
        </fieldset>

        <div>
          <label
            className="text-sm text-muted-foreground"
            htmlFor={`${id}-translation`}
          >
            Translation of
          </label>
          <select
            aria-describedby={
              translationError ? `${id}-translation-error` : undefined
            }
            aria-invalid={translationError ? true : undefined}
            className={`${SELECT_CLASS} mt-1.5`}
            id={`${id}-translation`}
            onChange={(event) =>
              onChange({ translationOf: event.target.value })
            }
            value={translationOf}
          >
            <option value="">None: this is the original</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.language
                  ? `${POST_LANGUAGE_LABELS[target.language].short} · `
                  : ""}
                {target.title}
              </option>
            ))}
          </select>
          <ErrorText
            id={`${id}-translation-error`}
            message={translationError}
          />
        </div>
      </div>
    </div>
  );
}
