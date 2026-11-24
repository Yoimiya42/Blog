/**
 * FR-BLOG-15 card rotation. Position sets the card type, not the post: the
 * first post is the lead, later posts cycle pair, row, row. A post without a
 * cover is a quote card wherever it falls and does not advance the cycle.
 */
export type FullBlock<Post> =
  | { kind: "lead"; post: Post }
  | { kind: "pair"; posts: [Post, Post] }
  | { kind: "row"; post: Post; coverSide: "start" | "end" }
  | { kind: "quote"; post: Post };

const CYCLE = ["pair", "row", "row"] as const;

export function planFullLayout<Post extends { cover: unknown }>(
  posts: readonly Post[],
): FullBlock<Post>[] {
  const blocks: FullBlock<Post>[] = [];
  let slot = 0;
  // Rows alternate their cover side, starting on the right.
  let coverSide: "start" | "end" = "end";

  const row = (post: Post) => {
    blocks.push({ kind: "row", post, coverSide });
    coverSide = coverSide === "end" ? "start" : "end";
  };

  for (let index = 0; index < posts.length; index += 1) {
    const post = posts[index] as Post;
    if (!post.cover) {
      blocks.push({ kind: "quote", post });
      continue;
    }
    if (index === 0) {
      blocks.push({ kind: "lead", post });
      continue;
    }

    const kind = CYCLE[slot % CYCLE.length];
    slot += 1;
    const next = posts[index + 1];
    if (kind === "pair" && next?.cover) {
      blocks.push({ kind: "pair", posts: [post, next] });
      index += 1;
    } else {
      // A pair left with one post renders it as a row.
      row(post);
    }
  }

  return blocks;
}

/** FR-BLOG-16 grouping: publication year in UTC, newest first. */
export function groupByYear<Post extends { publishedAt: Date }>(
  posts: readonly Post[],
): { year: number; posts: Post[] }[] {
  const groups: { year: number; posts: Post[] }[] = [];
  for (const post of posts) {
    const year = post.publishedAt.getUTCFullYear();
    const last = groups.at(-1);
    if (last?.year === year) last.posts.push(post);
    else groups.push({ year, posts: [post] });
  }

  return groups;
}
