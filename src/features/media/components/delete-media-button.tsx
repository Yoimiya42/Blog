"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteMediaAction,
  type DeleteMediaState,
} from "../server/media.actions";

const QUIET_CLASS =
  "min-h-11 rounded-control px-4 text-sm font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground";

function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 rounded-control bg-destructive px-5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null;
}

/**
 * Two steps for every item, and a third for an item a post shows: the server
 * names the posts, and only the action bound to `true` deletes it anyway
 * (ADR-0025).
 */
export function DeleteMediaButton({ mediaId }: { mediaId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [checkState, check] = useActionState<DeleteMediaState, FormData>(
    deleteMediaAction.bind(null, mediaId, false),
    { kind: "idle" },
  );
  const [forceState, force] = useActionState<DeleteMediaState, FormData>(
    deleteMediaAction.bind(null, mediaId, true),
    { kind: "idle" },
  );
  const error =
    forceState.kind === "error"
      ? forceState.message
      : checkState.kind === "error"
        ? checkState.message
        : null;

  if (!confirming) {
    return (
      <button
        className="min-h-11 rounded-control border border-destructive px-4 text-sm font-semibold text-destructive hover:bg-destructive/10"
        onClick={() => setConfirming(true)}
        type="button"
      >
        Delete
      </button>
    );
  }

  const cancel = (
    <button
      className={QUIET_CLASS}
      onClick={() => setConfirming(false)}
      type="button"
    >
      Cancel
    </button>
  );

  if (checkState.kind === "referenced") {
    const count = checkState.posts.length;

    return (
      <form action={force} className="space-y-3">
        <div className="text-sm" role="alert">
          <p className="font-medium text-destructive">
            {count === 1 ? "1 post shows" : `${count} posts show`} this image.
            Deleting it leaves “Image unavailable” in its place.
          </p>
          <ul className="mt-2 list-disc pl-5">
            {checkState.posts.map((post) => (
              <li key={post.id}>
                <Link
                  className="underline underline-offset-2"
                  href={`/admin/posts/${post.id}`}
                >
                  {post.title || "Untitled"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-3">
          <ConfirmButton label="Delete anyway" />
          {cancel}
        </div>
        <ErrorMessage message={error} />
      </form>
    );
  }

  return (
    <form action={check} className="space-y-3">
      <p className="text-sm" role="alert">
        Delete this image? It cannot be restored.
      </p>
      <div className="flex flex-wrap gap-3">
        <ConfirmButton label="Confirm delete" />
        {cancel}
      </div>
      <ErrorMessage message={error} />
    </form>
  );
}
