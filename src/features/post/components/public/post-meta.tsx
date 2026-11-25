import { Eye, Heart, Languages } from "lucide-react";
import Link from "next/link";

import { POST_LANGUAGE_LABELS } from "../../schema";
import type {
  PostVersion,
  PublicPostSummary,
} from "../../server/public-post.service";
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

/** FR-BLOG-18: the category name; nothing when unset. */
export function CategoryLabel({
  category,
}: {
  category: PublicPostSummary["category"];
}) {
  if (category === null) return null;

  return <span className="post-category">{category.name}</span>;
}

/**
 * FR-BLOG-22 on a card: the short label of each published language version.
 * Screen readers hear the full language names.
 */
export function LanguageMarker({
  languages,
}: {
  languages: PublicPostSummary["languages"];
}) {
  if (languages.length === 0) return null;

  return (
    <span className="post-languages">
      <Languages aria-hidden="true" />
      <span aria-hidden="true">
        {languages
          .map((language) => POST_LANGUAGE_LABELS[language].short)
          .join(" · ")}
      </span>
      <span className="sr-only">
        {`Written in ${languages
          .map((language) => POST_LANGUAGE_LABELS[language].name)
          .join(", ")}`}
      </span>
    </span>
  );
}

/**
 * FR-BLOG-22 on the post page: every published version, the current one as
 * text and the others as links.
 */
export function PostVersions({ versions }: { versions: PostVersion[] }) {
  if (versions.length === 0) return null;

  return (
    <nav aria-label="Language versions" className="post-languages">
      <Languages aria-hidden="true" />
      <ul>
        {versions.map((version) => {
          const label = POST_LANGUAGE_LABELS[version.language];

          return (
            <li key={version.language}>
              {version.current ? (
                <span aria-current="page" lang={version.language}>
                  <span aria-hidden="true">{label.short}</span>
                  <span className="sr-only">{label.name}</span>
                </span>
              ) : (
                <Link
                  hrefLang={version.language}
                  href={`/blog/${version.slug}`}
                  lang={version.language}
                >
                  <span aria-hidden="true">{label.short}</span>
                  <span className="sr-only">{label.name}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
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
