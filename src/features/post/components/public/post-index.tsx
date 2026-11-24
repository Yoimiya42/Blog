import Link from "next/link";
import type { ReactNode } from "react";

import type { BlogView } from "../../blog-view";
import type {
  PublicPostPage,
  PublicPostSummary,
} from "../../server/public-post.service";
import { CompactPostList, type CompactYear } from "./compact-post-list";
import { groupByYear } from "./group-by-year";
import { FullPostList, PinnedPosts } from "./post-cards";
import { toCalendarDate } from "./post-meta";
import { ViewSwitch } from "./view-switch";

function pageHref(basePath: string, page: number): string {
  // Page 1 has one canonical URL without a query string.
  return page === 1 ? basePath : `${basePath}?page=${page}`;
}

function Pagination({
  basePath,
  page,
  totalPages,
}: {
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="pagination">
      {page > 1 ? (
        <Link href={pageHref(basePath, page - 1)} rel="prev">
          Newer posts
        </Link>
      ) : (
        <span />
      )}
      <span className="pagination__status">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={pageHref(basePath, page + 1)} rel="next">
          Older posts
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function toCompactYears(posts: PublicPostSummary[]): CompactYear[] {
  return groupByYear(posts).map(({ year, posts: entries }) => ({
    year,
    posts: entries.map((post) => ({
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      date: toCalendarDate(post.publishedAt),
    })),
  }));
}

/** FR-BLOG-01 list body, shared by the blog index and tag archives. */
export function PostIndex({
  heading,
  result,
  pinned = [],
  basePath,
  emptyMessage,
  view,
}: {
  /** The page title block; the view switch sits beside it. */
  heading: ReactNode;
  result: PublicPostPage;
  /** FR-BLOG-17 pinned posts, full view on page 1 of the index only. */
  pinned?: PublicPostSummary[];
  basePath: string;
  emptyMessage: string;
  view: BlogView;
}) {
  const empty = result.posts.length === 0 && pinned.length === 0;

  return (
    <>
      <header className="blog-page__header">
        <div>{heading}</div>
        {empty ? null : (
          <ViewSwitch returnTo={pageHref(basePath, result.page)} view={view} />
        )}
      </header>
      {empty ? (
        <p className="post-index__empty">{emptyMessage}</p>
      ) : view === "compact" ? (
        <CompactPostList years={toCompactYears(result.posts)} />
      ) : (
        <>
          {pinned.length > 0 ? <PinnedPosts posts={pinned} /> : null}
          {result.posts.length > 0 ? (
            <FullPostList
              eagerFirst={pinned.length === 0}
              posts={result.posts}
            />
          ) : null}
        </>
      )}
      <Pagination
        basePath={basePath}
        page={result.page}
        totalPages={result.totalPages}
      />
    </>
  );
}
