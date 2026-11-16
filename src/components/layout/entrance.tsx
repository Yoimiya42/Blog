"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

/** v1 target; moves to the personal host when its content ships (PRD 3.3). */
const ENTRANCE_HREF = "/blog";

const LONG_PRESS_MS = 500;

/**
 * Upper bound for the whole sequence. If an animation never ends or the
 * destination never commits, the veil lifts and the navigation still happens.
 */
const STUCK_MS = 4000;

type Phase = "idle" | "closing" | "waiting";

/**
 * Starts the veiled navigation. Returns false when the caller should let the
 * browser follow the link instead.
 */
type Enter = (href: string) => boolean;

const EntranceContext = createContext<Enter | null>(null);

/**
 * Owns the full-page transition behind the hidden entrance. The veil closes
 * over the page, the route changes underneath, then the veil lifts.
 *
 * Lives in the site layout so it survives the navigation it decorates. The
 * glyph stays a real link: without this provider, without JavaScript, or under
 * reduced motion it navigates normally.
 */
export function EntranceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<string | null>(null);
  const stuckTimer = useRef<number | null>(null);

  const clearStuckTimer = useCallback(() => {
    if (stuckTimer.current !== null) {
      window.clearTimeout(stuckTimer.current);
      stuckTimer.current = null;
    }
  }, []);

  useEffect(() => clearStuckTimer, [clearStuckTimer]);

  const enter = useCallback<Enter>(
    (href) => {
      if (phase !== "idle") {
        return true;
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return false;
      }

      // Loads the destination while the veil closes, so the pause is not idle.
      router.prefetch(href);
      setTarget(href);
      setPhase("closing");
      stuckTimer.current = window.setTimeout(() => {
        stuckTimer.current = null;
        setPhase("idle");
        setTarget(null);
        if (window.location.pathname !== href) {
          router.push(href);
        }
      }, STUCK_MS);

      return true;
    },
    [phase, router],
  );

  // Derived rather than stored: the veil lifts once the new route has rendered.
  const lifting = phase === "waiting" && pathname === target;

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (phase === "closing" && target !== null) {
      router.push(target);
      setPhase("waiting");

      return;
    }

    if (lifting) {
      clearStuckTimer();
      setPhase("idle");
      setTarget(null);
    }
  }

  return (
    <EntranceContext.Provider value={enter}>
      {children}
      {phase === "idle" ? null : (
        <div
          aria-hidden="true"
          className="entrance-veil"
          data-phase={lifting ? "lifting" : phase}
          onAnimationEnd={handleAnimationEnd}
        />
      )}
    </EntranceContext.Provider>
  );
}

/** Unlabelled footer mark that leads to the inner site. */
export function EntranceGlyph() {
  const enter = useContext(EntranceContext);
  const pressTimer = useRef<number | null>(null);
  const touched = useRef(false);

  function clearPressTimer() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  useEffect(() => clearPressTimer, []);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Modified and non-primary clicks keep their browser meaning (new tab).
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    if (enter?.(ENTRANCE_HREF)) {
      event.preventDefault();
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLAnchorElement>) {
    touched.current = event.pointerType === "touch";
    if (!touched.current) {
      return;
    }

    clearPressTimer();
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      enter?.(ENTRANCE_HREF);
    }, LONG_PRESS_MS);
  }

  return (
    <a
      aria-label="Blog"
      className="entrance-glyph"
      href={ENTRANCE_HREF}
      onClick={handleClick}
      // A long press would otherwise open the link menu instead of the entrance.
      onContextMenu={(event) => {
        if (touched.current) {
          event.preventDefault();
        }
      }}
      onPointerCancel={clearPressTimer}
      onPointerDown={handlePointerDown}
      onPointerLeave={clearPressTimer}
      onPointerUp={clearPressTimer}
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 12 12">
        <path d="M6 0.5 7.4 4.6 11.5 6 7.4 7.4 6 11.5 4.6 7.4 0.5 6 4.6 4.6Z" />
      </svg>
    </a>
  );
}
