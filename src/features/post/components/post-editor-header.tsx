import { ArrowLeft, Eye, PenLine, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { PostStatus } from "../schema";
import { FocusModeToggle } from "./focus-mode-toggle";

export type PostEditorMode = "edit" | "preview";

const STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
};

const MODES: {
  mode: PostEditorMode;
  label: string;
  icon: LucideIcon;
  href: (postId: string, version?: string) => string;
}[] = [
  {
    mode: "edit",
    label: "Edit",
    icon: PenLine,
    href: (id) => `/admin/posts/${id}`,
  },
  {
    mode: "preview",
    label: "Preview",
    icon: Eye,
    // The version makes each saved state its own URL, so a prefetched preview
    // is never older than the last save or autosave. The page ignores it.
    href: (id, version) =>
      `/admin/posts/${id}/preview${version ? `?v=${version}` : ""}`,
  },
];

/**
 * Top row shared by the editor and its preview (FR-ADMIN-03). Three columns:
 * back, status, and save state on the left; the mode toggle in the centre;
 * page actions on the right, with focus mode always last. The equal outer
 * columns keep the toggle centred whatever the sides hold, so switching modes
 * never moves it under the pointer.
 */
export function PostEditorHeader({
  postId,
  status,
  mode,
  meta,
  actions,
  version,
}: {
  postId: string;
  status: PostStatus;
  mode: PostEditorMode;
  /** Token of the stored version, from the editor; keys the preview URL. */
  version?: string;
  /** Save state, after the post status. */
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"
      data-glass="bar"
    >
      <div className="flex min-w-0 items-center gap-1">
        <Link
          aria-label="Back to posts"
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "-ml-2 size-11 text-muted-foreground",
          })}
          href="/admin/posts"
          title="Back to posts"
        >
          <ArrowLeft />
        </Link>
        <h1 className="sr-only">
          {mode === "edit" ? "Edit post" : "Preview post"}
        </h1>
        <span
          className="flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground"
          title={STATUS_LABELS[status]}
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              status === "PUBLISHED" ? "bg-success" : "bg-faint",
            )}
          />
          {/* Narrow screens keep the dot; the toggle needs the room. */}
          <span className="sr-only sm:not-sr-only">
            {STATUS_LABELS[status]}
          </span>
        </span>
        {meta}
      </div>

      <nav
        aria-label="Post view"
        className="flex items-center rounded-control bg-foreground/5 p-0.5"
      >
        {MODES.map((item) => {
          const active = item.mode === mode;
          const Icon = item.icon;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-mark px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              href={item.href(postId, version)}
              key={item.mode}
              // The full payload, not only the loading shell: switching modes
              // then renders from memory instead of waiting on the server.
              prefetch
            >
              <Icon aria-hidden className="size-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex min-w-0 items-center justify-end gap-1">
        {actions}
        <FocusModeToggle />
      </div>
    </div>
  );
}
