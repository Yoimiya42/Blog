import Link from "next/link";

import { BLOG_VIEWS, type BlogView } from "../../blog-view";
import { setBlogViewAction } from "../../server/blog-view.actions";
import type {
  PublicPostPage,
  PublicPostSummary,
} from "../../server/public-post.service";
import { CompactPostList, type CompactYear } from "./compact-post-list";
import { groupByYear } from "./full-layout";
import { FullPostList } from "./post-cards";
import { toCalendarDate } from "./post-meta";

const VIEW_LABELS: Record<BlogView, string> = {
  full: "Full",
  compact: "Compact",
};

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

/**
 * Full or compact (FR-BLOG-01). A form, so it works before scripts load; the
 * action stores the choice and returns to this page.
 */
function ViewSwitch({ view, returnTo }: { view: BlogView; returnTo: string }) {
  return (
    <form action={setBlogViewAction} className="view-switch">
      <input name="returnTo" type="hidden" value={returnTo} />
      <div aria-label="List view" className="view-switch__group" role="group">
        {BLOG_VIEWS.map((option) => (
          <button
            aria-pressed={option === view}
            className="view-switch__option"
            key={option}
            name="view"
            type="submit"
            value={option}
          >
            {VIEW_LABELS[option]}
          </button>
        ))}
      </div>
    </form>
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
  result,
  basePath,
  emptyMessage,
  view,
}: {
  result: PublicPostPage;
  basePath: string;
  emptyMessage: string;
  view: BlogView;
}) {
  return (
    <>
      {result.posts.length === 0 ? (
        <p className="post-index__empty">{emptyMessage}</p>
      ) : (
        <>
          <ViewSwitch returnTo={pageHref(basePath, result.page)} view={view} />
          {view === "compact" ? (
            <CompactPostList years={toCompactYears(result.posts)} />
          ) : (
            <FullPostList posts={result.posts} />
          )}
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
