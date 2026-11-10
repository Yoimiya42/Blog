import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { isOwnerSession, originFromHeaders } from "./owner";
import { createRequestAuth } from "./request-auth";

/**
 * Authorises an admin request on the server. Every admin layout and page calls
 * this: a layout check alone does not cover pages rendered in parallel.
 * Non-owners receive 404 so the admin surface is not disclosed (FR-ADMIN-01).
 */
export async function requireOwner() {
  const session = await readSession();
  if (!session || !isOwnerSession(session)) notFound();

  return session;
}

async function readSession() {
  // Read outside the try block: Next.js signals dynamic rendering by throwing
  // from headers(), and that signal must propagate.
  const requestHeaders = await headers();
  const origin = originFromHeaders(requestHeaders);
  if (!origin) return null;

  try {
    const auth = await createRequestAuth(origin);

    return await auth.api.getSession({ headers: requestHeaders });
  } catch (error) {
    // Fail closed: a broken auth dependency must not expose the admin.
    console.error("Owner session check failed", error);

    return null;
  }
}
