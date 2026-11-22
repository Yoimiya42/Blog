"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Asks before the page unloads or an in-app link leaves it while `isDirty()`
 * holds (FR-ADMIN-18). The App Router has no navigation-blocking API, so
 * links are intercepted in the capture phase, before Next's own handler.
 * Links confirm in an in-app dialog: embedded browsers may suppress
 * `window.confirm`, which then cancels silently. Closing or reloading the tab
 * can only use the browser's own prompt. Browser back and forward are not
 * intercepted.
 */
export function UnsavedChangesGuard({ isDirty }: { isDirty: () => boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<URL | null>(null);
  // Set once the owner chose to leave, so the unload prompt does not ask twice.
  const leaving = useRef(false);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (leaving.current || !isDirty()) return;
      event.preventDefault();
      // Older browsers need a non-empty return value to show the prompt.
      event.returnValue = "";
    }

    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const next = new URL(anchor.href, window.location.href);
      const here = new URL(window.location.href);
      // An anchor on the same page does not leave it.
      if (next.origin === here.origin && next.pathname === here.pathname) {
        return;
      }
      if (!isDirty()) return;

      event.preventDefault();
      event.stopPropagation();
      setPending(next);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [isDirty]);

  function leave() {
    if (!pending) return;
    leaving.current = true;
    setPending(null);
    if (pending.origin === window.location.origin) {
      router.push(`${pending.pathname}${pending.search}${pending.hash}`);
    } else {
      window.location.assign(pending.href);
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
      open={pending !== null}
    >
      <DialogContent className="max-w-sm p-5" showClose={false}>
        <DialogTitle>Leave without saving?</DialogTitle>
        <DialogDescription className="mt-1.5">
          Unsaved changes will be lost.
        </DialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          {/* First in order, so it takes focus: Enter keeps the work. */}
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Keep editing
            </Button>
          </DialogClose>
          <Button onClick={leave} type="button" variant="destructive">
            Leave
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
