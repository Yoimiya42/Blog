"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";

import { deleteMomentAction } from "../server/moment.actions";

/**
 * Asks once, so one stray tap cannot delete a moment (FR-ADMIN-11).
 * `returnTo` leaves the page after the delete, as on the edit page.
 */
export function DeleteMomentButton({
  momentId,
  returnTo,
}: {
  momentId: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteMomentAction(momentId);
      toast(result.message, result.ok ? "success" : "error");
      if (returnTo) router.push(returnTo);
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Delete moment"
          className="size-11 text-muted-foreground hover:text-destructive"
          size="icon"
          title="Delete moment"
          type="button"
          variant="ghost"
        >
          <Trash2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-3">
        <p className="text-sm" role="alert">
          Delete this moment? It leaves the public feed.
        </p>
        <div className="mt-3 flex justify-end">
          <Button
            disabled={pending}
            onClick={remove}
            type="button"
            variant="destructive"
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
