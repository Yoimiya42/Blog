"use client";

import { ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";

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

function matches(post: PostSummary, query: string): boolean {
  return (
    post.title.toLowerCase().includes(query) ||
    post.slug.toLowerCase().includes(query)
  );
}

/** Grouped by state; filters by title or slug as the owner types (FR-ADMIN-20). */
export function PostList({ groups }: { groups: PostsByStatus }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  return (
    <div>
      <label className="relative block max-w-sm">
        <span className="sr-only">Filter posts</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint"
        />
        <input
          className="h-9 w-full rounded-control border border-border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-faint focus:border-ring"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by title or slug"
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
                <ul className="mt-3 divide-y divide-border rounded-card border border-border bg-card">
                  {posts.map((post) => (
                    <PostRow key={post.id} post={post} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PostRow({ post }: { post: PostSummary }) {
  const href = `/admin/posts/${post.id}`;
  const updated = post.updatedAt.toISOString();

  return (
    <li className="flex items-center gap-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <Link className="font-medium break-words hover:underline" href={href}>
          {post.title || "Untitled"}
        </Link>
        <p className="mt-1 text-sm break-all text-muted-foreground">
          <span className="font-mono">{post.slug}</span>
          {" · updated "}
          <time dateTime={updated}>{updated.slice(0, 10)}</time>
        </p>
      </div>

      {/* Always visible: the list has no hover-only actions. */}
      {post.status === "PUBLISHED" ? (
        <a
          aria-label={`View ${post.title} on the site`}
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "size-11 text-muted-foreground",
          })}
          href={`/blog/${post.slug}`}
          rel="noreferrer"
          target="_blank"
          title="View on the site"
        >
          <ExternalLink />
        </a>
      ) : null}
      <Link
        aria-label={`Edit ${post.title}`}
        className={buttonVariants({ variant: "outline" })}
        href={href}
      >
        Edit
      </Link>
    </li>
  );
}
