/* eslint-disable @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021). */
import { Pin } from "lucide-react";
import Link from "next/link";

import type { PublicPostSummary } from "../../server/public-post.service";
import { PostMeta, TagList } from "./post-meta";

// Rendered cover widths; the 40rem breakpoint matches `.post-grid` and
// `.post-card--pinned` in blog.css.
const SIZES = {
  grid: "(min-width: 40rem) 22rem, 100vw",
  pinned: "(min-width: 40rem) 24rem, 100vw",
} as const;

/** A post without a cover keeps the same frame, with its title set in it. */
function Cover({
  post,
  sizes,
  eager,
}: {
  post: PublicPostSummary;
  sizes: string;
  eager: boolean;
}) {
  const { cover } = post;

  return (
    <div className="post-card__media">
      {cover ? (
        <img
          alt={cover.alt}
          decoding="async"
          fetchPriority={eager ? "high" : undefined}
          height={cover.height}
          loading={eager ? "eager" : "lazy"}
          sizes={sizes}
          src={cover.url}
          srcSet={cover.srcSet}
          width={cover.width}
        />
      ) : (
        <span aria-hidden="true" className="post-card__placeholder">
          {post.title}
        </span>
      )}
    </div>
  );
}

/**
 * Same structure for every post (FR-BLOG-15). The title link stretches over
 * the card; tags sit above it and stay separate links.
 */
function PostCard({
  post,
  pinned = false,
  eager = false,
}: {
  post: PublicPostSummary;
  pinned?: boolean;
  eager?: boolean;
}) {
  return (
    <article className={pinned ? "post-card post-card--pinned" : "post-card"}>
      <Cover
        eager={eager}
        post={post}
        sizes={pinned ? SIZES.pinned : SIZES.grid}
      />
      <div className="post-card__body">
        <h2 className="post-card__title">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <div className="post-card__meta">
          {pinned ? (
            <span className="post-card__pin">
              <Pin aria-hidden="true" />
              <span className="sr-only">Pinned</span>
            </span>
          ) : null}
          <PostMeta post={post} />
        </div>
        {post.summary ? (
          <p className="post-card__summary">{post.summary}</p>
        ) : null}
        <TagList tags={post.tags} />
      </div>
    </article>
  );
}

/** FR-BLOG-17: above the grid on page 1 of the blog index. */
export function PinnedPosts({ posts }: { posts: PublicPostSummary[] }) {
  return (
    <section aria-label="Pinned posts">
      <ol className="post-pinned">
        {posts.map((post, index) => (
          <li key={post.slug}>
            <PostCard eager={index === 0} pinned post={post} />
          </li>
        ))}
      </ol>
    </section>
  );
}

/** FR-BLOG-15 full view: a uniform grid in date order. */
export function FullPostList({
  posts,
  eagerFirst,
}: {
  posts: PublicPostSummary[];
  /** False when pinned cards already hold the first screen. */
  eagerFirst: boolean;
}) {
  return (
    <ol className="post-grid">
      {posts.map((post, index) => (
        <li key={post.slug}>
          <PostCard eager={eagerFirst && index === 0} post={post} />
        </li>
      ))}
    </ol>
  );
}
