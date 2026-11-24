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
  const view = await getBlogView();
  // FR-BLOG-17: the full view lifts pinned posts out of the grid onto page 1.
  const full = view === "full";
  const [result, pinned] = await Promise.all([
    service.listPage(page, { excludePinned: full }),
    full && page === 1 ? service.listPinned() : Promise.resolve([]),
  ]);
  if (!result) notFound();

  return (
    <div className="blog-page">
      <PostIndex
        basePath="/blog"
        emptyMessage="No posts yet."
        heading={<h1 className="blog-page__title">Writing</h1>}
        pinned={pinned}
        result={result}
        view={view}
      />
    </div>
  );
}
