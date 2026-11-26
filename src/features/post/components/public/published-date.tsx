"use client";

import { useSyncExternalStore } from "react";

import { formatPublishedDate } from "./post-date";

const REFRESH_MS = 60_000;

// One clock for every date on the page. It changes only on a tick, so React
// reads the same value however often it asks during one render.
let clock = 0;

function readClock(): number {
  if (clock === 0) clock = Date.now();
  return clock;
}

function subscribe(onChange: () => void): () => void {
  const tick = () => {
    clock = Date.now();
    onChange();
  };
  // A page opened from cache or after client navigation catches up at once.
  tick();
  const timer = setInterval(tick, REFRESH_MS);

  return () => clearInterval(timer);
}

/**
 * FR-BLOG-21. The server renders the date against its request time; the
 * browser then reads its own clock and refreshes every minute, so a cached
 * page never keeps a stale `3 hours ago`.
 */
export function PublishedDate({
  date,
  renderedAt,
}: {
  /** ISO timestamp of publication. */
  date: string;
  /** Server request time, epoch milliseconds. */
  renderedAt: number;
}) {
  const now = useSyncExternalStore(subscribe, readClock, () => renderedAt);
  const published = new Date(date);

  return (
    <time dateTime={date} title={published.toISOString().slice(0, 10)}>
      {formatPublishedDate(published, new Date(now))}
    </time>
  );
}
