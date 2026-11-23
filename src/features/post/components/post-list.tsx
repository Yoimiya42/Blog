"use client";

import {
  Eye,
  Search,
  SquareArrowOutUpRight,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  POST_STATUSES,
  type PostsByStatus,
  type PostStatus,
  type PostSummary,
} from "../schema";

const GROUP_LABELS: Record<PostStatus, { heading: string; empty: string }> = {
  DRAFT: { heading: "Drafts", empty: "No drafts." },
  PUBLISHED: { heading: "Published", empty: "No published posts." },
};

// A fixed zone keeps server and client output identical.
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
});

/** Title and slug both match: the slug is the post's public URL. */
function matches(post: PostSummary, query: string): boolean {
  return (
    post.title.toLowerCase().includes(query) ||
    post.slug.toLowerCase().includes(query)
  );
}

/** Grouped by state; filters as the owner types (FR-ADMIN-20). */
export function PostList({ groups }: { groups: PostsByStatus }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  return (
    <TooltipProvider>
      <label className="relative block max-w-sm">
        <span className="sr-only">Filter posts</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint"
        />
        <input
          className="h-9 w-full rounded-control border border-border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-faint focus:border-ring"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter posts"
          type="search"
          value={query}
        />
      </label>

      <div className="mt-8 space-y-10">
        {POST_STATUSES.map((status) => {
          const posts = needle
            ? groups[status].filter((post) => matches(post, needle))
            : groups[status];

          return (
            <section aria-labelledby={`posts-${status}`} key={status}>
              <h2
                className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                id={`posts-${status}`}
              >
                {GROUP_LABELS[status].heading} ({posts.length})
              </h2>

              {posts.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {needle ? "No matches." : GROUP_LABELS[status].empty}
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
                  {posts.map((post) => (
                    <PostRow key={post.id} post={post} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

/**
 * The whole row opens the editor: the title link stretches over it. Actions
 * sit above that layer, share one icon style, and keep their column for a
 * draft, which has no public page yet.
 */
function PostRow({ post }: { post: PostSummary }) {
  const updated = post.updatedAt;

  return (
    <li className="relative flex items-center gap-4 py-3 pr-2 pl-4 transition-colors focus-within:bg-muted/50 hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <Link
          className="block truncate font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
          href={`/admin/posts/${post.id}`}
        >
          {post.title || "Untitled"}
        </Link>
        {post.summary ? (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {post.summary}
          </p>
        ) : null}
      </div>

      <time
        className="hidden shrink-0 text-sm text-muted-foreground tabular-nums sm:block"
        dateTime={updated.toISOString()}
        title="Last updated"
      >
        {DATE_FORMAT.format(updated)}
      </time>

      <div className="relative z-10 flex shrink-0 items-center">
        <RowAction
          href={`/admin/posts/${post.id}/preview`}
          icon={Eye}
          label="Preview"
        />
        {post.status === "PUBLISHED" ? (
          <RowAction
            external
            href={`/blog/${post.slug}`}
            icon={SquareArrowOutUpRight}
            label="View on site"
          />
        ) : (
          <span aria-hidden className="size-9" />
        )}
      </div>
    </li>
  );
}

function RowAction({
  href,
  icon: Icon,
  label,
  external = false,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  external?: boolean;
}) {
  const className = buttonVariants({
    variant: "ghost",
    size: "icon",
    className: "text-muted-foreground hover:text-foreground",
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {external ? (
          <a
            aria-label={label}
            className={className}
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            <Icon />
          </a>
        ) : (
          <Link aria-label={label} className={className} href={href}>
            <Icon />
          </Link>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
