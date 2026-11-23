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
  href: (postId: string) => string;
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
    href: (id) => `/admin/posts/${id}/preview`,
  },
];

/**
 * Top row shared by the editor and its preview (FR-ADMIN-03). The mode toggle
 * is always the last item, so switching modes never moves it under the
 * pointer; page-specific actions and status sit to its left.
 */
export function PostEditorHeader({
  postId,
  status,
  mode,
  meta,
  actions,
}: {
  postId: string;
  status: PostStatus;
  mode: PostEditorMode;
  /** Save state and statistics, left of the actions. */
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1" data-glass="bar">
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
      <span className="flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground">
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            status === "PUBLISHED" ? "bg-success" : "bg-faint",
          )}
        />
        {STATUS_LABELS[status]}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {meta}
        {actions}
        <FocusModeToggle />
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
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-mark px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                href={item.href(postId)}
                key={item.mode}
              >
                <Icon aria-hidden className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
