"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  POST_SLUG_MAX_LENGTH,
  POST_SUMMARY_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
} from "../schema";
import {
  savePostAction,
  type PostFormState,
  type PostFormValues,
} from "../server/post.actions";
import { SubmitButton } from "./submit-button";

interface PostFormProps {
  /** Null creates a post. */
  postId: string | null;
  initialValues: PostFormValues;
}

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-900 focus:ring-4 focus:ring-black/5 aria-invalid:border-red-700";

export function PostForm({ postId, initialValues }: PostFormProps) {
  const initialState: PostFormState = {
    values: initialValues,
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    savePostAction.bind(null, postId),
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
          spellCheck={false}
          type="text"
        />
        <p className="mt-2 text-sm text-stone-600" id="post-slug-hint">
          The post address. Lowercase letters, numbers, and hyphens.
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

      {state.formError ? (
        <p className="text-sm text-red-700" role="alert">
          {state.formError}
        </p>
      ) : null}
      {fieldErrors.content ? (
        <p className="text-sm text-red-700" role="alert">
          {fieldErrors.content}
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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-2 text-sm text-red-700" id={id} role="alert">
      {message}
    </p>
  );
}
