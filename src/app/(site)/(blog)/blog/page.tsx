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
  const result = await service.listPage(page);
  if (!result) notFound();

  return (
    <div className="blog-page">
      <h1 className="blog-page__title">Writing</h1>
      <PostIndex
        basePath="/blog"
        emptyMessage="No posts yet."
        result={result}
        view={await getBlogView()}
      />
    </div>
  );
}
