import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireOwner } from "@/features/auth";
import { getMediaService } from "@/features/media";
import { getPostService, type PostSummary } from "@/features/post";

const RECENT_LIMIT = 5;

/** Owner desk: counts, work to resume, and the two daily actions (FR-ADMIN-16). */
export default async function AdminPage() {
  const session = await requireOwner();
  const [groups, media] = await Promise.all([
    getPostService().then((service) => service.listByStatus(session)),
    getMediaService().then((service) => service.list(session)),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <Link className={buttonVariants()} href="/admin/posts/new">
          <Plus />
          New post
        </Link>
      </div>

      <ul className="mt-8 grid grid-cols-3 gap-3">
        <Stat href="/admin/posts" label="Drafts" value={groups.DRAFT.length} />
        <Stat
          href="/admin/posts"
          label="Published"
          value={groups.PUBLISHED.length}
        />
        <Stat href="/admin/media" label="Images" value={media.length} />
      </ul>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <RecentList
          empty="No drafts. Start one with New post."
          heading="Continue writing"
          posts={groups.DRAFT.slice(0, RECENT_LIMIT)}
        />
        <RecentList
          empty="Nothing published yet."
          heading="Recently published"
          posts={groups.PUBLISHED.slice(0, RECENT_LIMIT)}
        />
      </div>
    </div>
  );
}

function Stat({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <li>
      <Link
        className="block rounded-card border border-border bg-card p-4 transition-colors hover:border-faint sm:p-5"
        href={href}
      >
        <span className="block text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span className="mt-1 block text-2xl font-semibold tabular-nums">
          {value}
        </span>
      </Link>
    </li>
  );
}

function RecentList({
  heading,
  empty,
  posts,
}: {
  heading: string;
  empty: string;
  posts: PostSummary[];
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {heading}
      </h2>
      {posts.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-card border border-border bg-card">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                href={`/admin/posts/${post.id}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {post.title || "Untitled"}
                  </span>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={post.updatedAt.toISOString()}
                  >
                    {post.updatedAt.toISOString().slice(0, 10)}
                  </time>
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-4 text-faint transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
