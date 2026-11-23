import { notFound } from "next/navigation";

import { requireOwner } from "@/features/auth";
import {
  getMediaService,
  listMediaForPickerAction,
  MEDIA_UPLOAD_CONFIG,
} from "@/features/media";
import {
  collectMediaReferences,
  CONTENT_SCHEMA_VERSION,
  DeletePostButton,
  formatTagNames,
  getPostService,
  isBlankDraftIdentity,
  PostForm,
  toPostVersion,
  validateArticleDocument,
} from "@/features/post";

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
  const [tags, library] = await Promise.all([
    service.listTags(session, post.id),
    service.listAllTags(session),
  ]);

  // The editor opens only a document that is valid for the current schema
  // version. Anything else stays stored as it is until it is migrated.
  const stored =
    post.contentSchemaVersion === CONTENT_SCHEMA_VERSION
      ? validateArticleDocument(post.content)
      : null;
  const initialDocument = stored?.ok ? stored.document : null;
  const mediaIds = initialDocument
    ? collectMediaReferences(initialDocument)
    : [];
  const mediaService = mediaIds.length > 0 ? await getMediaService() : null;
  const resolved = mediaService
    ? await mediaService.resolveForArticle(mediaIds)
    : {};
  const initialMediaUrls = Object.fromEntries(
    Object.entries(resolved).map(([id, media]) => [id, media.url]),
  );
  // Known but not live: deleted from the library after the post used it.
  const unresolved = mediaIds.filter((id) => !Object.hasOwn(resolved, id));
  const deletedMediaIds =
    mediaService && unresolved.length > 0
      ? [...(await mediaService.findKnown(unresolved))]
      : [];

  return (
    <PostForm
      focusTitle={post.status === "DRAFT" && isBlankDraftIdentity(post)}
      headerActions={<DeletePostButton postId={post.id} title={post.title} />}
      imageUpload={{
        ...MEDIA_UPLOAD_CONFIG,
        loadLibrary: listMediaForPickerAction,
      }}
      initialDocument={initialDocument}
      deletedMediaIds={deletedMediaIds}
      initialMediaUrls={initialMediaUrls}
      initialValues={{
        title: post.title,
        slug: post.slug,
        summary: post.summary ?? "",
        tags: formatTagNames(tags),
      }}
      postId={post.id}
      slugFrozen={post.publishedAt !== null}
      status={post.status}
      tagSuggestions={library.map((tag) => tag.name)}
      version={toPostVersion(post.updatedAt)}
    />
  );
}
