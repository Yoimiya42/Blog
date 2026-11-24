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
