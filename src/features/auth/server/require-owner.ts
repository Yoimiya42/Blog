import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { readOwnerSession } from "./owner-session";

/**
 * Authorises an admin request on the server. Every admin layout and page calls
 * this: a layout check alone does not cover pages rendered in parallel.
 * Non-owners receive 404 so the admin surface is not disclosed (FR-ADMIN-01).
 */
export async function requireOwner() {
  // Read outside readOwnerSession's try block: Next.js signals dynamic
  // rendering by throwing from headers(), and that signal must propagate.
  const session = await readOwnerSession(await headers());
  if (!session) notFound();

  return session;
}
