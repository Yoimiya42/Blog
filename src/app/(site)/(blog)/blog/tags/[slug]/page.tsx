import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getBlogView, getPublicPostService, PostIndex } from "@/features/post";

import { parsePageNumber } from "../../../page-number";
import { decodeRouteParam } from "../../../route-param";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeRouteParam((await params).slug);

  return { title: `Tagged ${slug}` };
}

/** FR-BLOG-04 tag archive. Lists published posts only. */
export default async function TagArchivePage({ params, searchParams }: Props) {
  const slug = decodeRouteParam((await params).slug);
  const page = parsePageNumber((await searchParams).page);
  const service = await getPublicPostService();
  const [result, view] = await Promise.all([
    service.listTagPage(slug, page),
    getBlogView(),
  ]);
  if (!result) notFound();

  return (
    <div className="blog-page">
      <PostIndex
        basePath={`/blog/tags/${result.tag.slug}`}
        emptyMessage="No published posts with this tag."
        heading={
          <>
            <p className="blog-page__eyebrow">Tag</p>
            <h1 className="blog-page__title">{result.tag.name}</h1>
          </>
        }
        // A tag archive has no pinned section, so both views share one page.
        full={result}
        page={page}
        timeline={result}
        view={view}
      />
    </div>
  );
}
