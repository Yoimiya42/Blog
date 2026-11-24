"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";

/** One timeline row, prepared on the server (FR-BLOG-16). */
export interface CompactPost {
  slug: string;
  title: string;
  summary: string | null;
  /** `YYYY-MM-DD` in UTC, for `dateTime`. */
  date: string;
}

export interface CompactYear {
  year: number;
  posts: CompactPost[];
}

/**
 * Year-grouped timeline. Hover and keyboard focus reveal the summary in CSS.
 * Touch has no hover, so there the first tap reveals it and the second opens
 * the post. Without scripts every tap opens the post.
 */
export function CompactPostList({ years }: { years: CompactYear[] }) {
  const [open, setOpen] = useState<string | null>(null);

  function onClick(event: MouseEvent<HTMLAnchorElement>, post: CompactPost) {
    if (!post.summary || open === post.slug) return;
    if (!window.matchMedia("(hover: none)").matches) return;
    event.preventDefault();
    setOpen(post.slug);
  }

  return (
    <div className="timeline">
      {years.map(({ year, posts }) => (
        <section aria-labelledby={`year-${year}`} key={year}>
          <h2 className="timeline__year" id={`year-${year}`}>
            {year}
          </h2>
          <ol className="timeline__list">
            {posts.map((post) => (
              <li
                className="timeline__item"
                data-open={open === post.slug ? "" : undefined}
                key={post.slug}
              >
                <time className="timeline__date" dateTime={post.date}>
                  {post.date.slice(5)}
                </time>
                <span aria-hidden className="timeline__rail" />
                <div className="timeline__body">
                  <Link
                    className="timeline__title"
                    href={`/blog/${post.slug}`}
                    onClick={(event) => onClick(event, post)}
                  >
                    {post.title}
                  </Link>
                  {post.summary ? (
                    <div className="timeline__reveal">
                      <p className="timeline__summary">{post.summary}</p>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
