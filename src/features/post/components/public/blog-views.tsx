"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import {
  readBlogViewCookie,
  serializeBlogViewCookie,
  type BlogView,
} from "../../blog-view";
import { rememberBlogViewAction } from "../../server/blog-view.actions";
import { ViewSwitch } from "./view-switch";

// The choice made in this tab, then the cookie: a page restored from the
// router cache still shows the view chosen since it was rendered.
let chosen: BlogView | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function storeView(view: BlogView): void {
  chosen = view;
  document.cookie = serializeBlogViewCookie(view);
  // An older `httpOnly` cookie hides from scripts and rejects the write; the
  // server replaces it once, in the background.
  if (readBlogViewCookie(document.cookie) !== view) {
    void rememberBlogViewAction(view);
  }
  for (const listener of listeners) listener();
}

function readView(): BlogView | null {
  return chosen ?? readBlogViewCookie(document.cookie);
}

/**
 * Both views arrive rendered from the server; the switch only shows one
 * (FR-BLOG-01). Switching needs no request, and the page never swaps views
 * after load because the server renders the stored choice.
 */
export function BlogViews({
  initialView,
  heading,
  returnTo,
  full,
  compact,
}: {
  initialView: BlogView;
  heading: ReactNode;
  returnTo: string;
  full: ReactNode;
  compact: ReactNode;
}) {
  const view = useSyncExternalStore(
    subscribe,
    () => readView() ?? initialView,
    () => initialView,
  );

  return (
    <>
      <header className="blog-page__header">
        <div>{heading}</div>
        <ViewSwitch onSelect={storeView} returnTo={returnTo} view={view} />
      </header>
      <div hidden={view !== "full"}>{full}</div>
      <div hidden={view !== "compact"}>{compact}</div>
    </>
  );
}
