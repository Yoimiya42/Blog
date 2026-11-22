import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminCommandPalette } from "@/components/layout/admin-command-palette";
import { AdminShell, requireOwner } from "@/features/auth";
import { listPostsForCommandAction } from "@/features/post";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireOwner();

  return (
    <AdminShell
      search={<AdminCommandPalette loadPosts={listPostsForCommandAction} />}
    >
      {children}
    </AdminShell>
  );
}
