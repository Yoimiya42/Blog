"use client";
/* eslint-disable @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021). */

import {
  CircleSlash,
  Ellipsis,
  Eye,
  Pin,
  Search,
  SquareArrowOutUpRight,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  POST_STATUSES,
  toPostVersion,
  type PostsByStatus,
  type PostStatus,
  type PostSummary,
} from "../schema";
import { unpublishPostAction } from "../server/post.actions";

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

/**
 * Grouped by state; filters as the owner types (FR-ADMIN-20). `covers` maps a
 * post id to its cover thumbnail URL (FR-ADMIN-28).
 */
export function PostList({
  groups,
  covers = {},
}: {
  groups: PostsByStatus;
  covers?: Readonly<Record<string, string>>;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  // Titles stay aligned: every row keeps the slot once any post has a cover.
  const showCovers = Object.keys(covers).length > 0;

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
                    <PostRow
                      cover={showCovers ? (covers[post.id] ?? null) : undefined}
                      key={post.id}
                      post={post}
                    />
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
 * The whole row opens the post: the title link stretches over it. Actions
 * sit above that layer, share one icon style, and keep their column for a
 * draft, which has no public page or menu yet.
 */
function PostRow({
  post,
  cover,
}: {
  post: PostSummary;
  /** Undefined hides the slot; null keeps it empty. */
  cover?: string | null;
}) {
  const updated = post.updatedAt;

  return (
    <li className="relative flex items-center gap-4 py-3 pr-2 pl-4 transition-colors focus-within:bg-muted/50 hover:bg-muted/50">
      {cover === undefined ? null : (
        <span
          aria-hidden
          className="block h-9 w-14 shrink-0 overflow-hidden rounded-mark bg-muted"
        >
          {cover ? (
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              loading="lazy"
              src={cover}
            />
          ) : null}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            className="block truncate font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
            href={`/admin/posts/${post.id}`}
          >
            {post.title || "Untitled"}
          </Link>
          {post.pinnedAt ? (
            <>
              <Pin aria-hidden className="size-3.5 shrink-0 text-faint" />
              <span className="sr-only">Pinned</span>
            </>
          ) : null}
        </div>
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
          <>
            <RowAction
              external
              href={`/blog/${post.slug}`}
              icon={SquareArrowOutUpRight}
              label="View on site"
            />
            <RowMenu post={post} />
          </>
        ) : (
          <span aria-hidden className="w-18" />
        )}
      </div>
    </li>
  );
}

/** Less frequent actions on a published post (FR-ADMIN-20). */
function RowMenu({ post }: { post: PostSummary }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function unpublish() {
    startTransition(async () => {
      const result = await unpublishPostAction(
        post.id,
        toPostVersion(post.updatedAt),
      );
      if (!result.ok) {
        toast(result.message, "error");
        return;
      }
      toast("Unpublished");
      // The row moves to Drafts once the list renders again.
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="More actions"
              className="text-muted-foreground hover:text-foreground"
              disabled={pending}
              size="icon"
              variant="ghost"
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>More</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={unpublish}>
          <CircleSlash />
          Unpublish
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
