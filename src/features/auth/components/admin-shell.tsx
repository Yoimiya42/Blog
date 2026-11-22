import Link from "next/link";
import type { ReactNode } from "react";

import { LogoutButton } from "./logout-button";

const navigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/media", label: "Media" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-100 text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white">
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
                className="flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              className="hidden min-h-11 items-center rounded-lg px-3 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900 sm:flex"
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
    </div>
  );
}
