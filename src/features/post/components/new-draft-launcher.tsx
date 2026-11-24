"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * New post (ADR-0030). The draft is created after mount, never during the
 * GET render, so route prefetching cannot create rows. The action redirects
 * to the editor; until then the page holds the editor's shape.
 */
export function NewDraftLauncher({ create }: { create: () => Promise<void> }) {
  // Strict mode mounts twice in development; one request is enough.
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  function start() {
    setFailed(false);
    create().catch(() => setFailed(true));
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    create().catch(() => setFailed(true));
  }, [create]);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-muted-foreground" role="alert">
          Couldn’t create the post
        </p>
        <Button onClick={start} type="button" variant="outline">
          Try again
        </Button>
      </div>
    );
  }

  return <EditorSkeleton />;
}

/** The editor's outline: header row, writing card, settings sidebar. */
export function EditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Opening the editor" role="status">
      <div className="flex h-11 items-center">
        <div className="h-4 w-24 motion-safe:animate-pulse rounded-mark bg-foreground/5" />
      </div>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="space-y-4 rounded-card bg-card px-5 py-8 ring-1 ring-border md:px-12 md:py-12">
          <div className="h-9 w-2/3 motion-safe:animate-pulse rounded-control bg-foreground/5" />
          <div className="h-px bg-border" />
          <div className="h-4 w-full motion-safe:animate-pulse rounded-mark bg-foreground/5" />
          <div className="h-4 w-11/12 motion-safe:animate-pulse rounded-mark bg-foreground/5" />
          <div className="h-4 w-4/5 motion-safe:animate-pulse rounded-mark bg-foreground/5" />
        </div>
        <div className="hidden h-48 motion-safe:animate-pulse rounded-card bg-card ring-1 ring-border lg:block" />
      </div>
    </div>
  );
}
