import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/media", label: "Media" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-100 text-stone-900">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-stone-200 bg-white px-5">
        <Link className="font-semibold" href="/admin">
          Admin
        </Link>

        <Link className="text-sm text-stone-600" href="/">
          View site
        </Link>
      </header>

      <div className="mx-auto grid max-w-6xl md:grid-cols-[12rem_1fr]">
        <aside className="hidden border-r border-stone-200 px-4 py-8 md:block">
          <AdminNavigation />
        </aside>

        <main className="min-w-0 px-5 py-8 pb-24 md:px-8">{children}</main>
      </div>

      <div className="fixed inset-x-3 bottom-3 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg md:hidden">
        <AdminNavigation />
      </div>
    </div>
  );
}

function AdminNavigation() {
  return (
    <nav className="flex gap-1 md:flex-col" aria-label="Admin">
      {navigation.map((item) => (
        <Link
          className="flex-1 rounded-xl px-3 py-3 text-center text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 md:text-left"
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
