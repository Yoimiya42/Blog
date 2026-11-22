"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Toast as ToastPrimitive } from "radix-ui";
import { useEffect, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const MAX_VISIBLE = 3;
const EMPTY: ToastItem[] = [];

let items: ToastItem[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Shows a transient message in the admin toaster. Callable from any client code. */
export function toast(message: string, tone: ToastTone = "success") {
  items = [...items, { id: nextId++, message, tone }].slice(-MAX_VISIBLE);
  emit();
}

function dismiss(id: number) {
  items = items.filter((item) => item.id !== id);
  emit();
}

/** Mirrors `FLASH_COOKIE` in `src/lib/flash.ts`, which is server-only. */
const FLASH_COOKIE = "admin-flash";

function takeFlash(): string | null {
  const entry = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${FLASH_COOKIE}=`));
  if (!entry) return null;

  document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/admin; SameSite=Strict`;
  try {
    return decodeURIComponent(entry.slice(FLASH_COOKIE.length + 1));
  } catch {
    return null;
  }
}

/** Mounted once in the admin shell. Also shows flashes left by redirects. */
export function Toaster() {
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );
  const pathname = usePathname();

  // A redirecting action lands on a new path; check for its message there.
  useEffect(() => {
    const message = takeFlash();
    if (message) toast(message);
  }, [pathname]);

  return (
    <ToastPrimitive.Provider duration={4000} swipeDirection="right">
      {list.map((item) => (
        <ToastPrimitive.Root
          className={cn(
            "ui-motion flex items-center gap-2.5 rounded-container border border-border bg-popover py-2.5 pr-2 pl-3.5 text-sm text-popover-foreground shadow-lg",
            "data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=end]:hidden",
          )}
          key={item.id}
          onOpenChange={(open) => {
            if (!open) dismiss(item.id);
          }}
          type={item.tone === "error" ? "foreground" : "background"}
        >
          {item.tone === "error" ? (
            <CircleAlert
              aria-hidden
              className="size-4 shrink-0 text-destructive"
            />
          ) : (
            <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />
          )}
          <ToastPrimitive.Title className="min-w-0 flex-1">
            {item.message}
          </ToastPrimitive.Title>
          <ToastPrimitive.Close
            aria-label="Dismiss"
            className="flex size-7 shrink-0 items-center justify-center rounded-control text-faint hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden className="size-3.5" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}
