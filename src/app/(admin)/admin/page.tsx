import Link from "next/link";

import { requireOwner } from "@/features/auth";

export default async function AdminPage() {
  await requireOwner();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          className="rounded-card border border-border bg-card p-5 font-medium hover:border-faint"
          href="/admin/posts"
        >
          Posts
        </Link>

        <Link
          className="rounded-card border border-border bg-card p-5 font-medium hover:border-faint"
          href="/admin/media"
        >
          Media
        </Link>
      </div>
    </div>
  );
}
