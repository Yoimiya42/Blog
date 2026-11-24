import { cookies } from "next/headers";

import { BLOG_VIEW_COOKIE, parseBlogView, type BlogView } from "../blog-view";

/** The visitor's list view, for the blog index and tag archives. */
export async function getBlogView(): Promise<BlogView> {
  return parseBlogView((await cookies()).get(BLOG_VIEW_COOKIE)?.value);
}
