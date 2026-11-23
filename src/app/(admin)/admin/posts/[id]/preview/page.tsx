import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogShell } from "@/components/layout/blog-shell";
import { siteConfig } from "@/config/site";
import { requireOwner } from "@/features/auth";
import { homeContent } from "@/features/home";
import { getMediaService } from "@/features/media";
import {
  collectMediaReferences,
  getPostService,
  getPublicPostService,
  PostArticle,
  PostEditorHeader,
} from "@/features/post";

import "@/styles/formal.css";
import "@/styles/blog.css";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

/**
 * Owner preview of the saved version (FR-ADMIN-03). The editor's top row
 * stays in place, so the Edit and Preview toggle never moves; below it, the
 * public blog shell renders the post through the public read path, so layout
 * and table of contents match the published page.
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
    <div>
      <PostEditorHeader mode="preview" postId={id} status={stored.status} />

      {/* `overflow-clip`, not `hidden`: the table of contents stays sticky. */}
      <div className="formal preview-frame mt-4 overflow-clip rounded-card shadow-sm ring-1 ring-border">
        <BlogShell brand={homeContent.identity?.name ?? siteConfig.name}>
          <PostArticle
            mediaById={mediaById}
            post={post}
            showDraftNotice={false}
          />
        </BlogShell>
      </div>
    </div>
  );
}
