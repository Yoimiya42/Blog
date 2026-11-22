"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useState } from "react";

import type { ImageUploadConfig } from "../content/image-upload";
import type { ArticleDocument } from "../content/types";
import {
  POST_SLUG_MAX_LENGTH,
  POST_SUMMARY_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  type PostStatus,
} from "../schema";
import {
  autosavePostAction,
  savePostAction,
  type PostFormState,
  type PostFormValues,
} from "../server/post.actions";
import { createDraftAutosave, type AutosaveStatus } from "./draft-autosave";
import { SubmitButton } from "./submit-button";
import { TagPicker } from "./tag-picker";

const AUTOSAVE_INTERVAL_MS = 10_000;

/**
 * Mirrors `TAGS_PER_POST_MAX` in the tag module, checked by a unit test. The
 * tag index re-exports its repository, so this client module cannot import it.
 */
export const TAG_LIMIT_HINT = 10;

interface PostFormProps {
  /** Null creates a post. */
  postId: string | null;
  initialValues: PostFormValues;
  /**
   * The validated stored document. Null when the stored content is not valid
   * schema v1: the editor stays closed and a save keeps the stored content.
   */
  initialDocument: ArticleDocument | null;
  /** Null for a post that does not exist yet. */
  status: PostStatus | null;
  /** Version token of the stored post. Null for a new post. */
  version: string | null;
  /** True once the post has been published; the slug can no longer change. */
  slugFrozen: boolean;
  /** Image upload endpoint, from the media module through the page. */
  imageUpload?: ImageUploadConfig;
  /** Display URLs of the images in `initialDocument`, by media id. */
  initialMediaUrls?: Readonly<Record<string, string>>;
  /** Media ids in `initialDocument` that were deleted from the library. */
  deletedMediaIds?: readonly string[];
  /** Every tag name in the library, offered by the tag picker. */
  tagSuggestions?: readonly string[];
}

// A dynamic import keeps the TipTap runtime out of the statically imported
// module graph, so nothing that imports the post module bundles the editor.
// Until the chunk loads no content field exists, and a save sends none.
const ArticleEditor = dynamic(
  () => import("../content/editor/article-editor"),
  {
    ssr: false,
    loading: () => <p className="text-sm text-stone-500">Loading editor…</p>,
  },
);

const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 aria-invalid:border-red-700";

const SIDEBAR_HEADING_CLASS =
  "block text-xs font-medium tracking-wide text-stone-500 uppercase";

export function PostForm({
  postId,
  initialValues,
  initialDocument,
  status,
  version,
  slugFrozen,
  imageUpload,
  initialMediaUrls,
  deletedMediaIds,
  tagSuggestions = [],
}: PostFormProps) {
  const initialState: PostFormState = {
    values: initialValues,
    fieldErrors: {},
  };

  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>({
    kind: "idle",
  });
  // Created once: it owns the version token for the life of the form.
  const [autosave] = useState(() =>
    createDraftAutosave({
      initialContent: initialDocument ? JSON.stringify(initialDocument) : "",
      initialVersion: version ?? "",
      save: (current, content) =>
        autosavePostAction(postId ?? "", current, content),
      onStatus: setAutosaveStatus,
    }),
  );

  // Only an existing draft autosaves. A new post has no row to write to, and
  // a published post would change the public version without a decision.
  const autosaveEnabled =
    postId !== null && status === "DRAFT" && initialDocument !== null;

  useEffect(() => {
    autosave.setEnabled(autosaveEnabled);
  }, [autosave, autosaveEnabled]);

  // Publishing and unpublishing end in a fresh render with a new token.
  useEffect(() => {
    if (version !== null) autosave.syncVersion(version);
  }, [autosave, version]);

  useEffect(() => {
    if (!autosaveEnabled) return;

    const timer = setInterval(
      () => void autosave.flush(),
      AUTOSAVE_INTERVAL_MS,
    );

    return () => clearInterval(timer);
  }, [autosave, autosaveEnabled]);

  const saveOnBlur = useCallback(() => void autosave.flush(), [autosave]);

  const [state, formAction] = useActionState(
    (previous: PostFormState, formData: FormData) =>
      // Queued behind any autosave in flight, and sent with the token that
      // save produced.
      autosave.runExclusive(async (current, latestContent) => {
        if (current !== "") formData.set("version", current);
        // The form data was captured at submit. The editor stays editable
        // while this waits, and a queued autosave may have stored a newer
        // document since; send that one, not the snapshot.
        if (formData.has("content")) formData.set("content", latestContent);

        // A redirecting action may settle without a state; keep the last one.
        const next = (await savePostAction(postId, previous, formData)) as
          PostFormState | undefined;
        if (next?.version) {
          const content = formData.get("content");
          autosave.markSaved(
            next.version,
            typeof content === "string" ? content : undefined,
          );
        }

        return next ?? previous;
      }),
    initialState,
  );
  const { values, fieldErrors } = state;

  return (
    // The max lengths mirror the server rules; the server remains the authority.
    <form
      action={formAction}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"
      noValidate
    >
      <div className="min-w-0 rounded-2xl bg-white px-5 py-8 shadow-sm ring-1 ring-stone-200 md:px-12 md:py-12">
        <input
          aria-describedby={fieldErrors.title ? "post-title-error" : undefined}
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-label="Title"
          className="w-full bg-transparent text-3xl leading-tight font-semibold tracking-tight outline-none placeholder:text-stone-300 md:text-4xl"
          defaultValue={values.title}
          id="post-title"
          maxLength={POST_TITLE_MAX_LENGTH}
          name="title"
          placeholder="Title"
          type="text"
        />
        <FieldError id="post-title-error" message={fieldErrors.title} />

        <hr className="my-6 border-stone-200" />

        <p className="sr-only" id="post-content-label">
          Content
        </p>
        {initialDocument ? (
          <ArticleEditor
            imageUpload={imageUpload}
            initialDocument={initialDocument}
            deletedMediaIds={deletedMediaIds}
            initialMediaUrls={initialMediaUrls}
            labelledBy="post-content-label"
            name="content"
            onBlur={saveOnBlur}
            onChange={autosave.change}
          />
        ) : (
          <p className="text-sm text-red-700" role="alert">
            The stored content is not valid schema v1 and cannot be opened.
            Saving keeps it unchanged.
          </p>
        )}
        <FieldError id="post-content-error" message={fieldErrors.content} />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20">
        <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <div className="flex flex-wrap gap-2">
            <SubmitButton
              label={postId === null ? "Create draft" : "Save"}
              pendingLabel="Saving…"
            />
            {status === "DRAFT" ? (
              <SubmitButton
                intent="publish"
                label="Publish"
                pendingLabel="Publishing…"
                tone="secondary"
              />
            ) : null}
            {status === "PUBLISHED" ? (
              <SubmitButton
                intent="unpublish"
                label="Unpublish"
                pendingLabel="Unpublishing…"
                tone="secondary"
              />
            ) : null}
          </div>

          {state.formError ? (
            <p className="text-sm text-red-700" role="alert">
              {state.formError}
            </p>
          ) : null}
          {state.saved ? (
            <p className="text-sm text-green-800" role="status">
              Saved.
            </p>
          ) : null}
          {initialDocument ? (
            <AutosaveNote
              enabled={autosaveEnabled}
              status={autosaveStatus}
              postStatus={status}
            />
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <h2 className={SIDEBAR_HEADING_CLASS}>Tags</h2>
          <div className="mt-2">
            <TagPicker
              describedBy={fieldErrors.tags ? "post-tags-error" : undefined}
              defaultValue={values.tags}
              invalid={fieldErrors.tags ? true : undefined}
              limit={TAG_LIMIT_HINT}
              name="tags"
              suggestions={tagSuggestions}
            />
          </div>
          <FieldError id="post-tags-error" message={fieldErrors.tags} />
        </section>

        <details
          className="group rounded-2xl bg-white ring-1 ring-stone-200"
          // A collapsed field would hide its error, so an error opens it.
          key={fieldErrors.slug || fieldErrors.summary ? "error" : "ok"}
          open={Boolean(fieldErrors.slug || fieldErrors.summary)}
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium text-stone-600 hover:text-stone-900">
            Slug and summary
            <span
              aria-hidden
              className="text-stone-400 transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>

          <div className="space-y-4 px-4 pb-4">
            <div>
              <label className={SIDEBAR_HEADING_CLASS} htmlFor="post-slug">
                Slug
              </label>
              <input
                aria-describedby={
                  fieldErrors.slug ? "post-slug-error" : "post-slug-hint"
                }
                aria-invalid={fieldErrors.slug ? true : undefined}
                autoCapitalize="none"
                autoCorrect="off"
                className={`${INPUT_CLASS} font-mono`}
                defaultValue={values.slug}
                id="post-slug"
                maxLength={POST_SLUG_MAX_LENGTH}
                name="slug"
                readOnly={slugFrozen}
                spellCheck={false}
                type="text"
              />
              <p className="mt-1 text-xs text-stone-500" id="post-slug-hint">
                {slugFrozen
                  ? "Frozen since first publication."
                  : "Lowercase letters, numbers, hyphens. Frozen once published."}
              </p>
              <FieldError id="post-slug-error" message={fieldErrors.slug} />
            </div>

            <div>
              <label className={SIDEBAR_HEADING_CLASS} htmlFor="post-summary">
                Summary{" "}
                <span className="font-normal normal-case">(optional)</span>
              </label>
              <textarea
                aria-describedby={
                  fieldErrors.summary ? "post-summary-error" : undefined
                }
                aria-invalid={fieldErrors.summary ? true : undefined}
                className={INPUT_CLASS}
                defaultValue={values.summary}
                id="post-summary"
                maxLength={POST_SUMMARY_MAX_LENGTH}
                name="summary"
                rows={4}
              />
              <FieldError
                id="post-summary-error"
                message={fieldErrors.summary}
              />
            </div>
          </div>
        </details>

        <Link
          className="flex min-h-11 items-center px-1 text-sm text-stone-500 hover:text-stone-900"
          href="/admin/posts"
        >
          ← Back to posts
        </Link>
      </aside>
    </form>
  );
}

function AutosaveNote({
  enabled,
  status,
  postStatus,
}: {
  enabled: boolean;
  status: AutosaveStatus;
  postStatus: PostStatus | null;
}) {
  if (status.kind === "stopped") {
    return (
      <p className="text-sm text-red-700" role="alert">
        {status.reason === "conflict"
          ? "Autosave stopped: this post changed in another tab or window. Reload the page to continue."
          : "Autosave stopped: this post no longer exists."}
      </p>
    );
  }

  let message: string;
  if (!enabled) {
    if (postStatus === "PUBLISHED") {
      message = "Published posts are not autosaved. Save to update the post.";
    } else if (postStatus === null) {
      message = "Autosave starts once the draft is created.";
    } else {
      return null;
    }
  } else if (status.kind === "saving") {
    message = "Saving draft…";
  } else if (status.kind === "saved") {
    message = `Draft saved at ${status.at.toLocaleTimeString()}.`;
  } else if (status.kind === "error") {
    message = "Autosave failed. It retries in a few seconds.";
  } else {
    message = "Autosaves every 10 seconds and when the editor loses focus.";
  }

  return (
    <p className="text-xs text-stone-500" role="status">
      {message}
    </p>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-2 text-sm text-red-700" id={id} role="alert">
      {message}
    </p>
  );
}
