import { PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { requireOwner } from "@/features/auth";
import { getMediaService } from "@/features/media";
import {
  collectMediaReferences,
  getPostService,
  getPublicPostService,
  PostArticle,
} from "@/features/post";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

/**
 * Owner preview of the saved version (FR-ADMIN-03). It sits in the blog shell
 * and reads through the public path, so layout and table of contents match
 * the published page. The public post route stays free of session reads.
 */
export default async function PostPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOwner();
  const { id } = await params;
  const stored = await (await getPostService()).getById(session, id);
  if (!stored) notFound();
  const post = await (await getPublicPostService()).getBySlug(stored.slug);
  if (!post) notFound();

  const mediaIds = post.document ? collectMediaReferences(post.document) : [];
  const mediaById =
    mediaIds.length > 0
      ? await (await getMediaService()).resolveForArticle(mediaIds)
      : {};

  return (
    <>
      <PostArticle mediaById={mediaById} post={post} showDraftNotice={false} />

      {/* Floats over the page, so the preview keeps the published layout. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        <div
          aria-label="Preview"
          className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-background/90 py-1 pr-1 pl-4 text-sm shadow-lg backdrop-blur"
          role="region"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <span
              aria-hidden
              className={`size-1.5 rounded-full ${post.isDraft ? "bg-faint" : "bg-success"}`}
            />
            Preview · {post.isDraft ? "Draft" : "Published"}
          </span>
          <Link
            className={buttonVariants({
              size: "sm",
              className: "rounded-full no-underline",
            })}
            href={`/admin/posts/${id}`}
          >
            <PenLine />
            Back to editing
          </Link>
        </div>
      </div>
    </>
  );
}
