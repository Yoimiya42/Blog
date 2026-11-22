"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { deletePostAction } from "../server/post.actions";
import { SubmitButton } from "./submit-button";

interface DeletePostButtonProps {
  postId: string;
  title: string;
}

/** Two steps, so one stray click cannot delete a post. */
export function DeletePostButton({ postId, title }: DeletePostButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Delete post"
          className="size-11 text-muted-foreground hover:text-destructive"
          size="icon"
          title="Delete post"
          type="button"
          variant="ghost"
        >
          <Trash2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <form action={deletePostAction.bind(null, postId)}>
          <p className="text-sm" role="alert">
            Delete “{title}”? It leaves the admin and the public site.
          </p>
          <div className="mt-3 flex justify-end">
            <SubmitButton
              label="Delete"
              pendingLabel="Deleting…"
              tone="danger"
            />
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
