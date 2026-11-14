"use client";

import { useState } from "react";

import { deletePostAction } from "../server/post.actions";
import { SubmitButton } from "./submit-button";

interface DeletePostButtonProps {
  postId: string;
  title: string;
}

/** Two steps, so one stray click cannot delete a post. */
export function DeletePostButton({ postId, title }: DeletePostButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        className="min-h-11 rounded-xl border border-red-700 px-5 text-sm font-semibold text-red-700 hover:bg-red-50"
        onClick={() => setConfirming(true)}
        type="button"
      >
        Delete post
      </button>
    );
  }

  return (
    <form action={deletePostAction.bind(null, postId)}>
      <p className="text-sm" role="alert">
        Delete “{title}”? It leaves the admin and the public site.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <SubmitButton
          label="Confirm delete"
          pendingLabel="Deleting…"
          tone="danger"
        />
        <button
          className="min-h-11 rounded-xl px-4 text-sm font-medium text-stone-600 hover:bg-stone-200 hover:text-stone-900"
          onClick={() => setConfirming(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
