"use client";

import {
  AlignLeft,
  FileText,
  Link2,
  Lock,
  Tag as TagIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ImageUploadConfig } from "../content/image-upload";
import {
  POST_SLUG_MAX_LENGTH,
  POST_SUMMARY_MAX_LENGTH,
  type PostFieldErrors,
  type PostStatus,
} from "../schema";
import { CoverField, type CoverValue } from "./cover-field";
import { PinField } from "./pin-field";
import { SubmitButton } from "./submit-button";
import { TagPicker } from "./tag-picker";

/** Post settings edited in the publish dialog (ADR-0035). */
export interface PostSettings {
  slug: string;
  summary: string;
  /** Comma-separated names. */
  tags: string;
  cover: CoverValue | null;
  pinned: boolean;
}

/** Settings fields; an error on any of them opens the dialog. */
export const SETTINGS_FIELDS = [
  "slug",
  "summary",
  "tags",
  "coverId",
  "pinned",
] as const satisfies readonly (keyof PostFieldErrors)[];

const INPUT_CLASS =
  "w-full rounded-control border border-border bg-background px-3 py-2 text-sm outline-none focus:border-faint aria-invalid:border-destructive";

const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");

/**
 * Publish step (FR-ADMIN-07). Its fields are controlled by the editor form,
 * which carries them in hidden inputs; the dialog only renders them. The
 * submit buttons sit in a portal, so `formId` ties them to that form.
 */
export function PublishDialog({
  open,
  onOpenChange,
  formId,
  status,
  settings,
  onChange,
  fieldErrors,
  formError,
  stats,
  slugFrozen,
  tagSuggestions,
  tagLimit,
  imageUpload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  status: PostStatus;
  settings: PostSettings;
  onChange: (patch: Partial<PostSettings>) => void;
  fieldErrors: PostFieldErrors;
  formError?: string;
  stats: { words: number; readingMinutes: number } | null;
  slugFrozen: boolean;
  tagSuggestions: readonly string[];
  tagLimit: number;
  imageUpload?: ImageUploadConfig;
}) {
  const published = status === "PUBLISHED";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="flex max-h-[min(44rem,calc(100dvh-2rem))] flex-col p-0"
        // Focus lands on the dialog itself: on the first icon button it would
        // open that button's tooltip.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        <div className="border-b border-border px-5 pt-5 pb-4">
          <DialogTitle>
            {published ? "Update post" : "Publish post"}
          </DialogTitle>
          <DialogDescription className="mt-1 flex items-center gap-2 tabular-nums">
            <FileText aria-hidden className="size-4 text-faint" />
            {stats
              ? `${NUMBER_FORMAT.format(stats.words)} words${
                  stats.words > 0 ? ` · ${stats.readingMinutes} min read` : ""
                }`
              : "Post settings"}
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          <CoverField
            error={fieldErrors.coverId}
            imageUpload={imageUpload}
            onChange={(cover) => onChange({ cover })}
            value={settings.cover}
          />

          <PinField
            checked={settings.pinned}
            error={fieldErrors.pinned}
            onChange={(pinned) => onChange({ pinned })}
          />

          <Section icon={TagIcon} label="Tags">
            <TagPicker
              describedBy={fieldErrors.tags ? "post-tags-error" : undefined}
              invalid={fieldErrors.tags ? true : undefined}
              limit={tagLimit}
              onChange={(tags) => onChange({ tags })}
              suggestions={tagSuggestions}
              value={settings.tags}
            />
            <FieldError id="post-tags-error" message={fieldErrors.tags} />
          </Section>

          <Section icon={slugFrozen ? Lock : Link2} label="Slug">
            <input
              aria-describedby={
                fieldErrors.slug ? "post-slug-error" : "post-slug-hint"
              }
              aria-invalid={fieldErrors.slug ? true : undefined}
              aria-label="Slug"
              autoCapitalize="none"
              autoCorrect="off"
              className={`${INPUT_CLASS} font-mono read-only:text-muted-foreground`}
              id="post-slug"
              maxLength={POST_SLUG_MAX_LENGTH}
              onChange={(event) => onChange({ slug: event.target.value })}
              placeholder="post-address"
              readOnly={slugFrozen}
              spellCheck={false}
              type="text"
              value={settings.slug}
            />
            <p
              className="mt-1.5 text-xs text-muted-foreground"
              id="post-slug-hint"
            >
              {slugFrozen
                ? "Frozen since first publication."
                : "Lowercase letters, numbers, and hyphens. Frozen once published."}
            </p>
            <FieldError id="post-slug-error" message={fieldErrors.slug} />
          </Section>

          <Section icon={AlignLeft} label="Summary">
            <textarea
              aria-describedby={
                fieldErrors.summary ? "post-summary-error" : undefined
              }
              aria-invalid={fieldErrors.summary ? true : undefined}
              aria-label="Summary, optional"
              className={INPUT_CLASS}
              id="post-summary"
              maxLength={POST_SUMMARY_MAX_LENGTH}
              onChange={(event) => onChange({ summary: event.target.value })}
              placeholder="Optional"
              rows={3}
              value={settings.summary}
            />
            <FieldError id="post-summary-error" message={fieldErrors.summary} />
          </Section>
        </div>

        <div className="space-y-2 border-t border-border px-5 py-4">
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            {published ? (
              <>
                <p className="mr-auto text-xs text-muted-foreground">
                  Changes go live at once.
                </p>
                <SubmitButton
                  form={formId}
                  label="Update"
                  pendingLabel="Updating…"
                />
              </>
            ) : (
              <>
                <SubmitButton
                  form={formId}
                  label="Save draft"
                  pendingLabel="Saving…"
                  tone="secondary"
                />
                <SubmitButton
                  form={formId}
                  intent="publish"
                  label="Publish"
                  pendingLabel="Publishing…"
                />
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 p-4">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-faint" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-2 text-sm text-destructive" id={id} role="alert">
      {message}
    </p>
  );
}
