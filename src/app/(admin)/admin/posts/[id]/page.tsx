import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOwner } from "@/features/auth";
import { MEDIA_UPLOAD_CONFIG } from "@/features/media";
import {
  CONTENT_SCHEMA_VERSION,
  DeletePostButton,
  formatTagNames,
  getPostService,
  PostForm,
  toPostVersion,
  validateArticleDocument,
} from "@/features/post";

const STATUS_LABELS = { DRAFT: "Draft", PUBLISHED: "Published" } as const;

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOwner();
  const { id } = await params;
  const service = await getPostService();
  const post = await service.getById(session, id);
  if (!post) notFound();
  const tags = await service.listTags(session, post.id);

  // The editor opens only a document that is valid for the current schema
  // version. Anything else stays stored as it is until it is migrated.
  const stored =
    post.contentSchemaVersion === CONTENT_SCHEMA_VERSION
      ? validateArticleDocument(post.content)
      : null;
  const initialDocument = stored?.ok ? stored.document : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Edit post</h1>
        <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700">
          {STATUS_LABELS[post.status]}
        </span>
        <Link
          className="flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-stone-600 hover:bg-stone-200 hover:text-stone-900"
          href={`/admin/posts/${post.id}/preview`}
        >
          Preview saved version
        </Link>
      </div>

      <div className="mt-8">
        <PostForm
          imageUpload={MEDIA_UPLOAD_CONFIG}
          initialDocument={initialDocument}
          initialValues={{
            title: post.title,
            slug: post.slug,
            summary: post.summary ?? "",
            tags: formatTagNames(tags),
          }}
          postId={post.id}
          slugFrozen={post.publishedAt !== null}
          status={post.status}
          version={toPostVersion(post.updatedAt)}
        />
      </div>

      <section className="mt-12 max-w-2xl border-t border-stone-200 pt-8">
        <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
          Delete
        </h2>
        <div className="mt-3">
          <DeletePostButton postId={post.id} title={post.title} />
        </div>
      </section>
    </div>
  );
}
