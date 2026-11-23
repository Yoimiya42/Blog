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

interface UnsavedChangesGuardProps {
  isDirty: () => boolean;
  /** Saves the form; resolves true once stored. Omitted: leaving only asks. */
  save?: () => Promise<boolean>;
  /**
   * Saves without asking when an in-app link leaves. For drafts: a published
   * post's save changes the live page, so that stays a choice.
   */
  saveOnLeave?: boolean;
}

/**
 * Keeps unsaved editor changes when the owner leaves (FR-ADMIN-18). The App
 * Router has no navigation-blocking API, so links are intercepted in the
 * capture phase, before Next's own handler. A draft saves and then follows
 * the link; otherwise an in-app dialog asks, because embedded browsers may
 * suppress `window.confirm`, which then cancels silently. Closing or
 * reloading the tab can only use the browser's own prompt. Browser back and
 * forward are not intercepted.
 */
export function UnsavedChangesGuard({
  isDirty,
  save,
  saveOnLeave = false,
}: UnsavedChangesGuardProps) {
  const router = useRouter();
  const [pending, setPending] = useState<URL | null>(null);
  const [saving, setSaving] = useState(false);
  // Set once the owner chose to leave, so the unload prompt does not ask twice.
  const leaving = useRef(false);
  // One save per click: a second click while saving is ignored.
  const busy = useRef(false);

  function go(next: URL) {
    leaving.current = true;
    if (next.origin === window.location.origin) {
      router.push(`${next.pathname}${next.search}${next.hash}`);
    } else {
      window.location.assign(next.href);
    }
  }

  // Read by the listener, which is registered once per `isDirty`.
  const latest = useRef({ save, saveOnLeave, go });
  useEffect(() => {
    latest.current = { save, saveOnLeave, go };
  });

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

      const { save: saveNow, saveOnLeave: silent, go: follow } = latest.current;
      if (!saveNow || !silent) {
        setPending(next);
        return;
      }
      if (busy.current) return;
      busy.current = true;
      // A failed save stays on the page; the form shows why.
      void saveNow()
        .then((ok) => {
          if (ok) follow(next);
        })
        .finally(() => {
          busy.current = false;
        });
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
    setPending(null);
    go(pending);
  }

  async function saveAndLeave() {
    if (!pending || !save) return;
    setSaving(true);
    const ok = await save();
    setSaving(false);
    // On failure the dialog closes so the form's errors are visible.
    const next = pending;
    setPending(null);
    if (ok) go(next);
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !saving) setPending(null);
      }}
      open={pending !== null}
    >
      <DialogContent className="max-w-sm p-5" showClose={false}>
        <DialogTitle>
          {save ? "Save before leaving?" : "Leave without saving?"}
        </DialogTitle>
        <DialogDescription className="mt-1.5">
          {save
            ? "Saving updates the live post."
            : "Unsaved changes will be lost."}
        </DialogDescription>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {/* First in order, so it takes focus: Enter keeps the work. */}
          <DialogClose asChild>
            <Button disabled={saving} type="button" variant="ghost">
              Keep editing
            </Button>
          </DialogClose>
          <Button
            disabled={saving}
            onClick={leave}
            type="button"
            variant={save ? "outline" : "destructive"}
          >
            {save ? "Discard" : "Leave"}
          </Button>
          {save ? (
            <Button
              disabled={saving}
              onClick={() => void saveAndLeave()}
              type="button"
            >
              {saving ? "Saving…" : "Save and leave"}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
