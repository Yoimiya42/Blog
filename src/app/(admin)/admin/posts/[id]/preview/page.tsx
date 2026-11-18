import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOwner } from "@/features/auth";
import { getMediaService } from "@/features/media";
import {
  ARTICLE_PROSE_CLASS,
  ArticleContent,
  collectMediaReferences,
  CONTENT_SCHEMA_VERSION,
  getPostService,
  validateArticleDocument,
} from "@/features/post";

/**
 * Renders the saved document with the public renderer, so the preview and the
 * published article cannot diverge. Unsaved edits are not shown.
 */
export default async function PreviewPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOwner();
  const { id } = await params;
  const service = await getPostService();
  const post = await service.getById(session, id);
  if (!post) notFound();

  const stored =
    post.contentSchemaVersion === CONTENT_SCHEMA_VERSION
      ? validateArticleDocument(post.content)
      : null;
  const mediaIds = stored?.ok ? collectMediaReferences(stored.document) : [];
  const mediaById =
    mediaIds.length > 0
      ? await (await getMediaService()).resolveForArticle(mediaIds)
      : {};

  return (
    <div className="max-w-2xl">
      <Link
        className="inline-flex min-h-11 items-center rounded-xl text-sm font-medium text-stone-600 hover:text-stone-900"
        href={`/admin/posts/${post.id}`}
      >
        Back to editing
      </Link>
      <p className="mt-4 text-sm text-stone-600">
        Preview of the last saved version.
      </p>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        {post.title}
      </h1>
      {post.summary ? (
        <p className="mt-3 text-stone-600">{post.summary}</p>
      ) : null}

      <div className={`mt-8 ${ARTICLE_PROSE_CLASS}`}>
        {stored?.ok ? (
          <ArticleContent document={stored.document} mediaById={mediaById} />
        ) : (
          <p className="text-sm text-red-700" role="alert">
            The stored content is not valid schema v1 and cannot be previewed.
          </p>
        )}
      </div>
    </div>
  );
}
