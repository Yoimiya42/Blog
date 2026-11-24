import Link from "next/link";
import type { ReactNode } from "react";

import type { BlogView } from "../../blog-view";
import type {
  PublicPostPage,
  PublicPostSummary,
  TimelinePage,
  TimelinePost,
} from "../../server/public-post.service";
import { BlogViews } from "./blog-views";
import { CompactPostList, type CompactYear } from "./compact-post-list";
import { groupByYear } from "./group-by-year";
import { FullPostList, PinnedPosts } from "./post-cards";
import { toCalendarDate } from "./post-meta";

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

function toCompactYears(posts: TimelinePost[]): CompactYear[] {
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

/** A view can run out of pages before the other, which skips pinned posts. */
function NoPostsHere({ basePath }: { basePath: string }) {
  return (
    <p className="post-index__empty">
      No posts on this page. <Link href={basePath}>Go to the first page</Link>
    </p>
  );
}

/**
 * FR-BLOG-01 list body, shared by the blog index and tag archives. Both views
 * render here; `BlogViews` shows the stored one and switches without a
 * request. Each view paginates on its own.
 */
export function PostIndex({
  heading,
  page,
  full,
  pinned = [],
  timeline,
  basePath,
  emptyMessage,
  view,
}: {
  /** The page title block; the view switch sits beside it. */
  heading: ReactNode;
  page: number;
  /** Null when `page` is beyond the full view's last page. */
  full: PublicPostPage | null;
  /** FR-BLOG-17 pinned posts, page 1 of the index only. */
  pinned?: PublicPostSummary[];
  /** Null when `page` is beyond the timeline's last page. */
  timeline: TimelinePage | null;
  basePath: string;
  emptyMessage: string;
  view: BlogView;
}) {
  const fullCount = (full?.posts.length ?? 0) + pinned.length;
  const timelineCount = timeline?.posts.length ?? 0;
  if (fullCount === 0 && timelineCount === 0) {
    return (
      <>
        <header className="blog-page__header">
          <div>{heading}</div>
        </header>
        <p className="post-index__empty">{emptyMessage}</p>
      </>
    );
  }

  const fullBody =
    full === null ? (
      <NoPostsHere basePath={basePath} />
    ) : (
      <>
        {pinned.length > 0 ? <PinnedPosts posts={pinned} /> : null}
        {full.posts.length > 0 ? (
          <FullPostList eagerFirst={pinned.length === 0} posts={full.posts} />
        ) : null}
        <Pagination
          basePath={basePath}
          page={full.page}
          totalPages={full.totalPages}
        />
      </>
    );

  const timelineBody =
    timeline === null ? (
      <NoPostsHere basePath={basePath} />
    ) : (
      <>
        <CompactPostList years={toCompactYears(timeline.posts)} />
        <Pagination
          basePath={basePath}
          page={timeline.page}
          totalPages={timeline.totalPages}
        />
      </>
    );

  return (
    <BlogViews
      compact={timelineBody}
      full={fullBody}
      heading={heading}
      initialView={view}
      returnTo={pageHref(basePath, page)}
    />
  );
}
