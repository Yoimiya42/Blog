import Link from "next/link";

import { requireOwner } from "@/features/auth";

export default async function AdminPage() {
  await requireOwner();

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          className="rounded-2xl border border-stone-200 bg-white p-5 font-medium hover:border-stone-400"
          href="/admin/posts"
        >
          Posts
        </Link>

        <Link
          className="rounded-2xl border border-stone-200 bg-white p-5 font-medium hover:border-stone-400"
          href="/admin/media"
        >
          Media
        </Link>
      </div>
    </div>
  );
}
