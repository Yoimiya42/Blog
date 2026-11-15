import { requireOwner } from "@/features/auth";
import { EMPTY_ARTICLE_DOCUMENT, PostForm } from "@/features/post";

export default async function NewPostPage() {
  await requireOwner();

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">New post</h1>

      <div className="mt-8">
        <PostForm
          initialDocument={EMPTY_ARTICLE_DOCUMENT}
          initialValues={{ title: "", slug: "", summary: "" }}
          postId={null}
          slugFrozen={false}
          status={null}
          version={null}
        />
      </div>
    </div>
  );
}
