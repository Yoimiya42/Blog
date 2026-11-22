"use client";

import { useEffect } from "react";

const LEAVE_MESSAGE = "Leave without saving? Unsaved changes will be lost.";

/**
 * Asks before the page unloads or an in-app link leaves it while `isDirty()`
 * holds (FR-ADMIN-18). The App Router has no navigation-blocking API, so
 * links are intercepted in the capture phase, before Next's own handler.
 * Browser back and forward are not intercepted.
 */
export function useUnsavedChangesGuard(isDirty: () => boolean): void {
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty()) return;
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

      if (isDirty() && !window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [isDirty]);
}
