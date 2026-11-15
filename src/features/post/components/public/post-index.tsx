import Link from "next/link";

import type { PublicPostPage } from "../../server/public-post.service";
import { PostMeta, TagList } from "./post-meta";

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

/** FR-BLOG-01 list body, shared by the blog index and tag archives. */
export function PostIndex({
  result,
  basePath,
  emptyMessage,
}: {
  result: PublicPostPage;
  basePath: string;
  emptyMessage: string;
}) {
  return (
    <>
      {result.posts.length === 0 ? (
        <p className="post-index__empty">{emptyMessage}</p>
      ) : (
        <ol className="post-index">
          {result.posts.map((post) => (
            <li className="post-card" key={post.slug}>
              <h2 className="post-card__title">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <PostMeta post={post} />
              {post.summary ? (
                <p className="post-card__summary">{post.summary}</p>
              ) : null}
              <TagList tags={post.tags} />
            </li>
          ))}
        </ol>
      )}
      <Pagination
        basePath={basePath}
        page={result.page}
        totalPages={result.totalPages}
      />
    </>
  );
}
