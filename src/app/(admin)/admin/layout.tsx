import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell, requireOwner } from "@/features/auth";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireOwner();

  return <AdminShell>{children}</AdminShell>;
}
