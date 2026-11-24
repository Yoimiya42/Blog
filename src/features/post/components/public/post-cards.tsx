/* eslint-disable @next/next/no-img-element -- Cloudflare Images serves fixed widths (ADR-0021). */
import Link from "next/link";

import type {
  PostCover,
  PublicPostSummary,
} from "../../server/public-post.service";
import { planFullLayout } from "./full-layout";
import { PostMeta, TagList } from "./post-meta";

// Rendered widths of each card's cover; the 62.5rem breakpoint matches
// `.post-grid` in blog.css.
const SIZES = {
  lead: "(min-width: 62.5rem) 25rem, 100vw",
  pair: "(min-width: 62.5rem) 21rem, 100vw",
  row: "8rem",
} as const;

function Cover({
  cover,
  sizes,
  eager = false,
}: {
  cover: PostCover;
  sizes: string;
  eager?: boolean;
}) {
  return (
    <div className="post-card__media">
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
    </div>
  );
}

/** The title link stretches over the card; tags sit above it. */
function Title({ post }: { post: PublicPostSummary }) {
  return (
    <h2 className="post-card__title">
      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
    </h2>
  );
}

function Summary({ post }: { post: PublicPostSummary }) {
  return post.summary ? (
    <p className="post-card__summary">{post.summary}</p>
  ) : null;
}

function LeadCard({ post }: { post: PublicPostSummary }) {
  const { cover } = post;
  if (!cover) return <QuoteCard post={post} />;

  return (
    <article className="post-card post-card--lead">
      <Cover cover={cover} eager sizes={SIZES.lead} />
      <div className="post-card__body">
        <Title post={post} />
        <PostMeta post={post} />
        <Summary post={post} />
        <TagList tags={post.tags} />
      </div>
    </article>
  );
}

function PairCard({ post }: { post: PublicPostSummary }) {
  const { cover } = post;
  if (!cover) return <QuoteCard post={post} />;

  return (
    <article className="post-card post-card--pair">
      <Cover cover={cover} sizes={SIZES.pair} />
      <div className="post-card__body">
        <Title post={post} />
        <PostMeta post={post} />
        <TagList tags={post.tags} />
      </div>
    </article>
  );
}

function RowCard({
  post,
  coverSide,
}: {
  post: PublicPostSummary;
  coverSide: "start" | "end";
}) {
  const { cover } = post;
  if (!cover) return <QuoteCard post={post} />;

  return (
    <article className="post-card post-card--row" data-cover-side={coverSide}>
      <div className="post-card__body">
        <Title post={post} />
        <PostMeta post={post} />
        <Summary post={post} />
      </div>
      <Cover cover={cover} sizes={SIZES.row} />
    </article>
  );
}

/** No cover: the summary carries the card, or the title when there is none. */
function QuoteCard({ post }: { post: PublicPostSummary }) {
  return (
    <article
      className="post-card post-card--quote"
      data-has-summary={post.summary ? "" : undefined}
    >
      {post.summary ? <p className="post-card__quote">{post.summary}</p> : null}
      <div className="post-card__body">
        <Title post={post} />
        <PostMeta post={post} />
      </div>
    </article>
  );
}

/**
 * FR-BLOG-15 full view: card types rotate by position. The planner already
 * routes coverless posts to quote cards; each card checks again for types.
 */
export function FullPostList({ posts }: { posts: PublicPostSummary[] }) {
  return (
    <ol className="post-grid">
      {planFullLayout(posts).flatMap((block) => {
        switch (block.kind) {
          case "lead":
            return (
              <li key={block.post.slug}>
                <LeadCard post={block.post} />
              </li>
            );
          case "pair":
            return block.posts.map((post) => (
              <li className="post-grid__half" key={post.slug}>
                <PairCard post={post} />
              </li>
            ));
          case "row":
            return (
              <li key={block.post.slug}>
                <RowCard coverSide={block.coverSide} post={block.post} />
              </li>
            );
          case "quote":
            return (
              <li key={block.post.slug}>
                <QuoteCard post={block.post} />
              </li>
            );
        }
      })}
    </ol>
  );
}
