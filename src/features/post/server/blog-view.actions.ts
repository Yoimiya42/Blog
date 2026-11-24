"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  BLOG_VIEW_COOKIE,
  parseBlogView,
  safeBlogReturnPath,
} from "../blog-view";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Stores the visitor's list view and reloads the page they were on. A plain
 * form posts here, so the switch also works before scripts load.
 */
export async function setBlogViewAction(formData: FormData): Promise<void> {
  const view = parseBlogView(formData.get("view"));

  (await cookies()).set(BLOG_VIEW_COOKIE, view, {
    path: "/blog",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
    httpOnly: true,
  });

  redirect(safeBlogReturnPath(formData.get("returnTo")));
}
