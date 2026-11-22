import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
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
      <div className="flex items-center gap-1">
        <Link
          aria-label="Back to posts"
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "-ml-2 size-11 text-muted-foreground",
          })}
          href="/admin/posts"
          title="Back to posts"
        >
          <ArrowLeft />
        </Link>
        <h1 className="text-sm font-medium text-muted-foreground">New post</h1>
      </div>

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
