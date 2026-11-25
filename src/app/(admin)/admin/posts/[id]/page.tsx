import { notFound } from "next/navigation";

import { requireOwner } from "@/features/auth";
import {
  EDITOR_BACKGROUND_OPACITIES,
  getEditorBackgroundService,
  getMediaService,
  listMediaForPickerAction,
  MEDIA_UPLOAD_CONFIG,
  resetPostEditorBackgroundAction,
  updatePostEditorBackgroundAction,
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
  const [tags, library, background] = await Promise.all([
    service.listTags(session, post.id),
    service.listAllTags(session),
    getEditorBackgroundService().then((backgrounds) =>
      backgrounds.getForPost(session, post.id),
    ),
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
  const mediaService =
    mediaIds.length > 0 || post.coverId ? await getMediaService() : null;
  const resolved =
    mediaService && mediaIds.length > 0
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

  // A cover that no longer resolves was deleted; the field says so.
  const covers =
    mediaService && post.coverId
      ? await mediaService.resolveCovers([post.coverId])
      : {};
  const initialCover = post.coverId
    ? {
        mediaId: post.coverId,
        thumbnailUrl: covers[post.coverId]?.thumbnailUrl ?? null,
      }
    : null;

  return (
    <PostForm
      background={{
        initial: background,
        opacities: EDITOR_BACKGROUND_OPACITIES,
        // Bound to this post: changes here never touch the default.
        save: updatePostEditorBackgroundAction.bind(null, post.id),
        reset: resetPostEditorBackgroundAction.bind(null, post.id),
      }}
      focusTitle={post.status === "DRAFT" && isBlankDraftIdentity(post)}
      headerActions={<DeletePostButton postId={post.id} title={post.title} />}
      imageUpload={{
        ...MEDIA_UPLOAD_CONFIG,
        loadLibrary: listMediaForPickerAction,
      }}
      initialCover={initialCover}
      initialPinned={post.pinnedAt !== null}
      initialCategory={post.category ?? ""}
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
