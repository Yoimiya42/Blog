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
}

// A dynamic import keeps the TipTap runtime out of the statically imported
// module graph, so nothing that imports the post module bundles the editor.
// Until the chunk loads no content field exists, and a save sends none.
const ArticleEditor = dynamic(
  () => import("../content/editor/article-editor"),
  {
    ssr: false,
    loading: () => (
      <p className="mt-2 text-sm text-stone-600">Loading editor…</p>
    ),
  },
);

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-900 focus:ring-4 focus:ring-black/5 aria-invalid:border-red-700";

export function PostForm({
  postId,
  initialValues,
  initialDocument,
  status,
  version,
  slugFrozen,
  imageUpload,
  initialMediaUrls,
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
    <form action={formAction} className="max-w-2xl space-y-6" noValidate>
      <div>
        <label className="block text-sm font-medium" htmlFor="post-title">
          Title
        </label>
        <input
          aria-describedby={fieldErrors.title ? "post-title-error" : undefined}
          aria-invalid={fieldErrors.title ? true : undefined}
          className={INPUT_CLASS}
          defaultValue={values.title}
          id="post-title"
          maxLength={POST_TITLE_MAX_LENGTH}
          name="title"
          type="text"
        />
        <FieldError id="post-title-error" message={fieldErrors.title} />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="post-slug">
          Slug
        </label>
        <input
          aria-describedby={
            fieldErrors.slug ? "post-slug-error" : "post-slug-hint"
          }
          aria-invalid={fieldErrors.slug ? true : undefined}
          autoCapitalize="none"
          autoCorrect="off"
          className={`${INPUT_CLASS} font-mono text-sm`}
          defaultValue={values.slug}
          id="post-slug"
          maxLength={POST_SLUG_MAX_LENGTH}
          name="slug"
          readOnly={slugFrozen}
          spellCheck={false}
          type="text"
        />
        <p className="mt-2 text-sm text-stone-600" id="post-slug-hint">
          {slugFrozen
            ? "The post address. Frozen since first publication."
            : "The post address. Lowercase letters, numbers, and hyphens. Frozen once published."}
        </p>
        <FieldError id="post-slug-error" message={fieldErrors.slug} />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="post-summary">
          Summary
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
          rows={3}
        />
        <FieldError id="post-summary-error" message={fieldErrors.summary} />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="post-tags">
          Tags
        </label>
        <input
          aria-describedby={
            fieldErrors.tags ? "post-tags-error" : "post-tags-hint"
          }
          aria-invalid={fieldErrors.tags ? true : undefined}
          autoCapitalize="none"
          className={INPUT_CLASS}
          defaultValue={values.tags}
          id="post-tags"
          name="tags"
          type="text"
        />
        <p className="mt-2 text-sm text-stone-600" id="post-tags-hint">
          Comma-separated, up to {TAG_LIMIT_HINT}. A new name creates the tag.
        </p>
        <FieldError id="post-tags-error" message={fieldErrors.tags} />
      </div>

      <div>
        <p className="block text-sm font-medium" id="post-content-label">
          Content
        </p>
        {initialDocument ? (
          <div className="mt-2">
            <ArticleEditor
              imageUpload={imageUpload}
              initialDocument={initialDocument}
              initialMediaUrls={initialMediaUrls}
              labelledBy="post-content-label"
              name="content"
              onBlur={saveOnBlur}
              onChange={autosave.change}
            />
            <AutosaveNote
              enabled={autosaveEnabled}
              status={autosaveStatus}
              postStatus={status}
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-red-700" role="alert">
            The stored content is not valid schema v1 and cannot be opened.
            Saving keeps it unchanged.
          </p>
        )}
        <FieldError id="post-content-error" message={fieldErrors.content} />
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

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          label={postId === null ? "Create draft" : "Save"}
          pendingLabel="Saving…"
        />
        {status === "DRAFT" ? (
          <SubmitButton
            intent="publish"
            label="Save and publish"
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
        <Link
          className="flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-stone-600 hover:bg-stone-200 hover:text-stone-900"
          href="/admin/posts"
        >
          Back to posts
        </Link>
      </div>
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
      <p className="mt-2 text-sm text-red-700" role="alert">
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
    <p className="mt-2 text-sm text-stone-600" role="status">
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
