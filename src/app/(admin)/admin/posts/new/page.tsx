import { requireOwner } from "@/features/auth";
import {
  listMediaForPickerAction,
  MEDIA_UPLOAD_CONFIG,
} from "@/features/media";
import {
  EMPTY_ARTICLE_DOCUMENT,
  getPostService,
  PostForm,
} from "@/features/post";

export default async function NewPostPage() {
  const session = await requireOwner();
  const library = await (await getPostService()).listAllTags(session);

  return (
    <div>
      <h1 className="text-lg font-semibold">New post</h1>

      <div className="mt-4">
        <PostForm
          imageUpload={{
            ...MEDIA_UPLOAD_CONFIG,
            loadLibrary: listMediaForPickerAction,
          }}
          initialDocument={EMPTY_ARTICLE_DOCUMENT}
          initialValues={{ title: "", slug: "", summary: "", tags: "" }}
          postId={null}
          slugFrozen={false}
          status={null}
          tagSuggestions={library.map((tag) => tag.name)}
          version={null}
        />
      </div>
    </div>
  );
}
