import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { requireOwner } from "@/features/auth";
import { getMediaService } from "@/features/media";
import {
  collectMediaReferences,
  getPublicPostService,
  PostArticle,
} from "@/features/post";

type Props = { params: Promise<{ slug: string }> };

// Metadata and the page read the same post; one query per request.
const loadPost = cache(async (slug: string) => {
  const service = await getPublicPostService();

  return service.getBySlug(slug);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await loadPost((await params).slug);
  // The page decides 404 versus owner preview; metadata must not leak a draft.
  if (!post || post.isDraft) return { robots: { index: false } };

  return { title: post.title, description: post.summary ?? undefined };
}

/**
 * Permanent post route. A draft at the same URL is the protected preview link
 * (FR-BLOG-06): the owner sees it, everyone else gets 404.
 */
export default async function PostPage({ params }: Props) {
  const post = await loadPost((await params).slug);
  if (!post) notFound();
  // Checked only for drafts, so published pages never read the session.
  if (post.isDraft) await requireOwner();

  const mediaIds = post.document ? collectMediaReferences(post.document) : [];
  const mediaById =
    mediaIds.length > 0
      ? await (await getMediaService()).resolveForArticle(mediaIds)
      : {};

  return <PostArticle mediaById={mediaById} post={post} />;
}
