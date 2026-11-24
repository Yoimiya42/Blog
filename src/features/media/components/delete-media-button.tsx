"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import {
  deleteMediaAction,
  type DeleteMediaState,
} from "../server/media.actions";

function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant="destructive">
      {pending ? "Deleting…" : label}
    </Button>
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
export function DeleteMediaButton({
  mediaId,
  isBackground = false,
  onDeleted,
}: {
  mediaId: string;
  /** Adds a notice that the editor returns to the plain canvas. */
  isBackground?: boolean;
  /** Called once the item is gone, e.g. to close the detail dialog. */
  onDeleted?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [checkState, check] = useActionState<DeleteMediaState, FormData>(
    deleteMediaAction.bind(null, mediaId, false),
    { kind: "idle" },
  );
  const [forceState, force] = useActionState<DeleteMediaState, FormData>(
    deleteMediaAction.bind(null, mediaId, true),
    { kind: "idle" },
  );
  const deleted =
    checkState.kind === "deleted" || forceState.kind === "deleted";
  const error =
    forceState.kind === "error"
      ? forceState.message
      : checkState.kind === "error"
        ? checkState.message
        : null;

  useEffect(() => {
    if (!deleted) return;
    toast("Image deleted");
    onDeleted?.();
  }, [deleted, onDeleted]);

  if (!confirming) {
    return (
      <Button
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setConfirming(true)}
        type="button"
        variant="ghost"
      >
        <Trash2 />
        Delete
      </Button>
    );
  }

  const cancel = (
    <Button onClick={() => setConfirming(false)} type="button" variant="ghost">
      Cancel
    </Button>
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
        <div className="flex flex-wrap gap-2">
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
        {isBackground
          ? " It is an editor background; editors that use it return to the plain canvas."
          : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <ConfirmButton label="Confirm delete" />
        {cancel}
      </div>
      <ErrorMessage message={error} />
    </form>
  );
}
