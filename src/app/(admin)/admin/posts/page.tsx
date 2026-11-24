import { Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireOwner } from "@/features/auth";
import { getMediaService } from "@/features/media";
import { getPostService, PostList } from "@/features/post";

export default async function AdminPostsPage() {
  const session = await requireOwner();
  const service = await getPostService();
  const groups = await service.listByStatus(session);

  // Live covers only; a deleted image leaves the slot empty.
  const withCover = [...groups.DRAFT, ...groups.PUBLISHED].filter(
    (post) => post.coverId !== null,
  );
  const resolved =
    withCover.length > 0
      ? await (
          await getMediaService()
        ).resolveCovers(withCover.map((post) => post.coverId as string))
      : {};
  const covers = Object.fromEntries(
    withCover.flatMap((post) => {
      const cover = resolved[post.coverId as string];
      return cover ? [[post.id, cover.thumbnailUrl]] : [];
    }),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
        <Link className={buttonVariants()} href="/admin/posts/new">
          <Plus />
          New post
        </Link>
      </div>

      <div className="mt-8">
        <PostList covers={covers} groups={groups} />
      </div>
    </div>
  );
}
