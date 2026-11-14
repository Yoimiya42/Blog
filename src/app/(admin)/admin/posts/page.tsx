import Link from "next/link";

import { requireOwner } from "@/features/auth";
import { getPostService, PostList } from "@/features/post";

export default async function AdminPostsPage() {
  const session = await requireOwner();
  const service = await getPostService();
  const groups = await service.listByStatus(session);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Posts</h1>
        <Link
          className="flex min-h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-black"
          href="/admin/posts/new"
        >
          New post
        </Link>
      </div>

      <div className="mt-8">
        <PostList groups={groups} />
      </div>
    </div>
  );
}
