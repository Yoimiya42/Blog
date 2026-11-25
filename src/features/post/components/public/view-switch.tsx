"use client";

import { LayoutGrid, List, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { parseBlogView, type BlogView } from "../../blog-view";
import { setBlogViewAction } from "../../server/blog-view.actions";

const OPTIONS: { view: BlogView; label: string; icon: LucideIcon }[] = [
  { view: "full", label: "Cards", icon: LayoutGrid },
  { view: "compact", label: "Timeline", icon: List },
];

/**
 * Full or compact (FR-BLOG-01, ADR-0034). With scripts, `onSelect` switches
 * in the page. Before scripts load, the form posts to the action, which stores
 * the choice and returns to this page.
 */
export function ViewSwitch({
  view,
  returnTo,
  onSelect,
}: {
  view: BlogView;
  returnTo: string;
  onSelect: (view: BlogView) => void;
}) {
  return (
    <form
      action={setBlogViewAction}
      className="view-switch"
      onSubmit={(event) => {
        // React skips the action when the submit event is cancelled.
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        onSelect(
          parseBlogView(
            submitter instanceof HTMLButtonElement ? submitter.value : null,
          ),
        );
      }}
    >
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
