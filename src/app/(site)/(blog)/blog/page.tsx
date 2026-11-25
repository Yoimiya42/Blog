import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getBlogView, getPublicPostService, PostIndex } from "@/features/post";

import { parsePageNumber } from "../page-number";

export const metadata: Metadata = { title: "Writing" };

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const page = parsePageNumber((await searchParams).page);
  const service = await getPublicPostService();
  // Both views render, so switching needs no request (FR-BLOG-01). The full
  // view lifts pinned posts out of its grid onto page 1 (FR-BLOG-17); the
  // timeline lists every post and paginates on its own.
  const [full, pinned, timeline, view] = await Promise.all([
    service.listPage(page, { excludePinned: true }),
    page === 1 ? service.listPinned() : Promise.resolve([]),
    service.listTimelinePage(page),
    getBlogView(),
  ]);
  if (!full && !timeline) notFound();

  return (
    <div className="blog-page">
      <PostIndex
        basePath="/blog"
        emptyMessage="No posts yet."
        full={full}
        heading={<h1 className="blog-page__title">Writing</h1>}
        page={page}
        pinned={pinned}
        timeline={timeline}
        view={view}
      />
    </div>
  );
}
