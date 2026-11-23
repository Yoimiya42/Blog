import Link from "next/link";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/toast";

import { LogoutButton } from "./logout-button";

const navigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/media", label: "Media" },
] as const;

/** `search` is the command palette, injected by the admin layout. */
export function AdminShell({
  children,
  search,
}: {
  children: ReactNode;
  search?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-muted text-foreground" data-admin-canvas>
      <header
        className="sticky top-0 z-20 border-b border-border bg-background"
        data-focus-hide
        data-glass
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 md:px-8">
          <Link className="shrink-0 font-semibold" href="/admin">
            Admin
          </Link>

          <nav
            aria-label="Admin"
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
          >
            {navigation.map((item) => (
              <Link
                className="flex min-h-11 shrink-0 items-center rounded-control px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            {search}
            <Link
              className="hidden min-h-11 items-center rounded-control px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
              href="/"
            >
              View site
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl min-w-0 px-4 py-8 pb-16 md:px-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
