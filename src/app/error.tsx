"use client";

import Link from "next/link";

import "@/styles/formal.css";

/** Public render failures (FR-ADMIN-22). The admin has its own boundary. */
export default function PublicError({ reset }: { reset: () => void }) {
  return (
    <div className="formal">
      <main className="system-page">
        <p className="system-page__code">Error</p>
        <h1 className="system-page__title">Something went wrong</h1>
        <p className="system-page__body">
          The page failed to load. Try again in a moment.
        </p>
        <div className="system-page__actions">
          <button
            className="action action--primary"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <Link className="action" href="/">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
