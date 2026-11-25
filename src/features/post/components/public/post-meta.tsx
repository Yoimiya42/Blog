import { Eye, Heart } from "lucide-react";
import Link from "next/link";

import { POST_CATEGORY_NAMES } from "../../schema";
import type { PublicPostSummary } from "../../server/public-post.service";
import { countLabel, formatCount } from "./format-count";
import { requestTime } from "./post-date";
import { PublishedDate } from "./published-date";

/**
 * Calendar date in UTC. Pages render on the server, so a fixed zone keeps the
 * date identical for every visitor and between list and detail pages.
 */
export function toCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Publication date (FR-BLOG-21) and reading time. */
export function PostMeta({
  post,
}: {
  post: Pick<PublicPostSummary, "publishedAt" | "readingMinutes">;
}) {
  return (
    <p className="post-meta">
      <PublishedDate
        date={post.publishedAt.toISOString()}
        // Read once per server render; the browser takes over after load.
        renderedAt={requestTime()}
      />
      {post.readingMinutes === null ? null : (
        <>
          <span aria-hidden="true"> · </span>
          {post.readingMinutes} min read
        </>
      )}
    </p>
  );
}

export function TagList({ tags }: { tags: PublicPostSummary["tags"] }) {
  if (tags.length === 0) return null;

  return (
    <ul aria-label="Tags" className="tag-list">
      {tags.map((tag) => (
        <li key={tag.id}>
          <Link className="tag" href={`/blog/tags/${tag.slug}`}>
            {tag.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** FR-BLOG-18: the category name in its colour; nothing when unset. */
export function CategoryLabel({
  category,
}: {
  category: PublicPostSummary["category"];
}) {
  if (category === null) return null;

  return (
    <span className="post-category" data-category={category}>
      {POST_CATEGORY_NAMES[category]}
    </span>
  );
}

/**
 * FR-BLOG-19 and FR-BLOG-20 counts, with exact numbers for screen readers.
 * The post page leaves likes to its live like button.
 */
export function EngagementCounts({
  post,
  showLikes = true,
}: {
  post: Pick<PublicPostSummary, "views" | "likes">;
  showLikes?: boolean;
}) {
  return (
    <p className="post-counts">
      <span>
        <Eye aria-hidden="true" />
        <span aria-hidden="true">{formatCount(post.views)}</span>
        <span className="sr-only">{countLabel(post.views, "view")}</span>
      </span>
      {showLikes ? (
        <span>
          <Heart aria-hidden="true" />
          <span aria-hidden="true">{formatCount(post.likes)}</span>
          <span className="sr-only">{countLabel(post.likes, "like")}</span>
        </span>
      ) : null}
    </p>
  );
}
