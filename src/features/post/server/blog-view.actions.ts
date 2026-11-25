"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  BLOG_VIEW_COOKIE,
  BLOG_VIEW_COOKIE_OPTIONS,
  parseBlogView,
  safeBlogReturnPath,
} from "../blog-view";

/**
 * Stores the visitor's list view and reloads the page they were on. Only the
 * no-script path posts here: with scripts the switch toggles in the page and
 * writes the cookie itself, so the cookie is not `httpOnly`.
 */
export async function setBlogViewAction(formData: FormData): Promise<void> {
  const view = parseBlogView(formData.get("view"));

  (await cookies()).set(BLOG_VIEW_COOKIE, view, BLOG_VIEW_COOKIE_OPTIONS);

  redirect(safeBlogReturnPath(formData.get("returnTo")));
}

/**
 * Replaces a preference cookie the page cannot overwrite: one set `httpOnly`
 * before the switch moved into the page. No redirect; the page has already
 * switched.
 */
export async function rememberBlogViewAction(view: unknown): Promise<void> {
  (await cookies()).set(
    BLOG_VIEW_COOKIE,
    parseBlogView(view),
    BLOG_VIEW_COOKIE_OPTIONS,
  );
}
