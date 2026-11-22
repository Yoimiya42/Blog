import Link from "next/link";

import {
  POST_STATUSES,
  type PostsByStatus,
  type PostStatus,
  type PostSummary,
} from "../schema";

const GROUP_LABELS: Record<PostStatus, { heading: string; empty: string }> = {
  DRAFT: { heading: "Drafts", empty: "No drafts." },
  PUBLISHED: { heading: "Published", empty: "No published posts." },
};

export function PostList({ groups }: { groups: PostsByStatus }) {
  return (
    <div className="space-y-10">
      {POST_STATUSES.map((status) => (
        <section aria-labelledby={`posts-${status}`} key={status}>
          <h2
            className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
            id={`posts-${status}`}
          >
            {GROUP_LABELS[status].heading} ({groups[status].length})
          </h2>

          {groups[status].length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {GROUP_LABELS[status].empty}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-card border border-border bg-card">
              {groups[status].map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function PostRow({ post }: { post: PostSummary }) {
  const href = `/admin/posts/${post.id}`;
  const updated = post.updatedAt.toISOString();

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1 basis-48">
        <Link className="font-medium break-words hover:underline" href={href}>
          {post.title}
        </Link>
        <p className="mt-1 text-sm break-all text-muted-foreground">
          <span className="font-mono">{post.slug}</span>
          {" · updated "}
          <time dateTime={updated}>{updated.slice(0, 10)}</time>
        </p>
      </div>

      {/* Always visible: the list has no hover-only actions. */}
      <Link
        aria-label={`Edit ${post.title}`}
        className="flex min-h-11 items-center rounded-control border border-input px-4 text-sm font-medium hover:bg-muted"
        href={href}
      >
        Edit
      </Link>
    </li>
  );
}
