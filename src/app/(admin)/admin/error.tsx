"use client";

import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Renders inside the admin shell, so navigation stays available. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page failed to load. Nothing was changed.
      </p>
      {error.digest ? (
        <p className="mt-1 font-mono text-xs text-faint">{error.digest}</p>
      ) : null}
      <Button className="mt-6" onClick={reset} type="button">
        <RotateCw />
        Try again
      </Button>
    </div>
  );
}
