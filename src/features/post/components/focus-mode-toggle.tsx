"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STORAGE_KEY = "editor-focus-mode";

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

/**
 * Focus mode (FR-ADMIN-23): `data-focus-mode` on the root element hides the
 * admin navigation and the settings sidebar; see `globals.css`. Lives in the
 * editor header, so edit and preview share it. Remembered per browser and
 * cleared when the editor pages unmount.
 */
export function FocusModeToggle() {
  const [on, setOn] = useState(false);

  // Read after mount: the server cannot know the stored preference.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (readPreference()) setOn(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (on) root.dataset.focusMode = "";
    else delete root.dataset.focusMode;
    return () => {
      delete root.dataset.focusMode;
    };
  }, [on]);

  const toggle = useCallback(() => {
    setOn((current) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, current ? "off" : "on");
      } catch {
        // Storage can be blocked; the mode still works on this page.
      }
      return !current;
    });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "." && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggle();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const Icon = on ? Minimize2 : Maximize2;
  const label = on ? "Exit focus mode" : "Focus mode";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={label}
            aria-pressed={on}
            className="text-muted-foreground"
            onClick={toggle}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Icon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {label}
          <kbd className="ml-2 font-sans opacity-70">Ctrl .</kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
