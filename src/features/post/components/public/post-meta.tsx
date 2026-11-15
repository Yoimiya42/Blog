import Link from "next/link";

import type { PublicPostSummary } from "../../server/public-post.service";

/**
 * Calendar date in UTC. Pages render on the server, so a fixed zone keeps the
 * date identical for every visitor and between list and detail pages.
 */
export function toCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function PostMeta({
  post,
}: {
  post: Pick<PublicPostSummary, "publishedAt" | "readingMinutes">;
}) {
  const date = toCalendarDate(post.publishedAt);

  return (
    <p className="post-meta">
      <time dateTime={date}>{date}</time>
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
          <Link className="tag" href={`/tags/${tag.slug}`}>
            {tag.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
