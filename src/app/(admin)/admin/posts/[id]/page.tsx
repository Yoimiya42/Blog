import { notFound } from "next/navigation";

import { requireOwner } from "@/features/auth";
import {
  CONTENT_SCHEMA_VERSION,
  DeletePostButton,
  getPostService,
  PostForm,
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
      </div>

      <div className="mt-8">
        <PostForm
          initialDocument={initialDocument}
          initialValues={{
            title: post.title,
            slug: post.slug,
            summary: post.summary ?? "",
          }}
          postId={post.id}
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
