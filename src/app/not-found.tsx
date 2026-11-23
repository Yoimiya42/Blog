import type { Metadata } from "next";
import Link from "next/link";

import "@/styles/formal.css";

export const metadata: Metadata = { title: "Not found" };

/**
 * Every unknown URL, and every non-owner `/admin` request (FR-ADMIN-01), ends
 * here, so the admin surface looks like any missing page (FR-ADMIN-22).
 */
export default function NotFound() {
  return (
    <div className="formal">
      <main className="system-page">
        <p className="system-page__code">404</p>
        <h1 className="system-page__title">Page not found</h1>
        <p className="system-page__body">
          The address may be mistyped, or the page has moved.
        </p>
        <Link className="action action--primary" href="/">
          Home
        </Link>
      </main>
    </div>
  );
}
