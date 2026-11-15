import Link from "next/link";
import type { ReactNode } from "react";

/** Formal-host chrome for blog pages. The homepage keeps its own section nav. */
export function BlogShell({
  brand,
  children,
}: {
  brand: string;
  children: ReactNode;
}) {
  return (
    <div className="blog">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="site-head">
        <div className="site-head__in">
          <Link className="site-head__brand" href="/">
            {brand}
          </Link>
          <nav aria-label="Primary">
            <ul className="site-head__nav">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/blog">Writing</Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="blog-main" id="content">
        {children}
      </main>
      <footer className="site-foot">
        <div className="site-foot__in">© {brand}</div>
      </footer>
    </div>
  );
}
