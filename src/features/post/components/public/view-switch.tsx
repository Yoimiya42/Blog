"use client";

import { LayoutGrid, List, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { BlogView } from "../../blog-view";
import { setBlogViewAction } from "../../server/blog-view.actions";

const OPTIONS: { view: BlogView; label: string; icon: LucideIcon }[] = [
  { view: "full", label: "Cards", icon: LayoutGrid },
  { view: "compact", label: "Timeline", icon: List },
];

/**
 * Full or compact (FR-BLOG-01, ADR-0034). A form, so it works before scripts
 * load; the action stores the choice and returns to this page.
 */
export function ViewSwitch({
  view,
  returnTo,
}: {
  view: BlogView;
  returnTo: string;
}) {
  return (
    <form action={setBlogViewAction} className="view-switch">
      <input name="returnTo" type="hidden" value={returnTo} />
      <TooltipProvider>
        <div
          aria-label="List view"
          className="flex rounded-control border border-border p-0.5"
          role="group"
        >
          {OPTIONS.map(({ view: option, label, icon: Icon }) => {
            const active = option === view;

            return (
              <Tooltip key={option}>
                <TooltipTrigger asChild>
                  {/* 44px touch target for public pages (PRD 6.3). */}
                  <Button
                    aria-label={label}
                    aria-pressed={active}
                    className={
                      active
                        ? "size-11 bg-muted text-foreground"
                        : "size-11 text-muted-foreground"
                    }
                    name="view"
                    size="icon"
                    type="submit"
                    value={option}
                    variant="ghost"
                  >
                    <Icon aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </form>
  );
}
