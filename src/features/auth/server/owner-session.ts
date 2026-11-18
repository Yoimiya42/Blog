import { isOwnerSession, originFromHeaders } from "./owner";
import { createRequestAuth } from "./request-auth";

/**
 * The owner session carried by `requestHeaders`, or null. Fails closed: a
 * broken auth dependency reads as no session. Works outside the framework, so
 * the Worker entry can authorise before reading a request body (ADR-0024).
 */
export async function readOwnerSession(requestHeaders: Headers) {
  const origin = originFromHeaders(requestHeaders);
  if (!origin) return null;

  try {
    const auth = await createRequestAuth(origin);
    const session = await auth.api.getSession({ headers: requestHeaders });

    return session && isOwnerSession(session) ? session : null;
  } catch (error) {
    console.error("Owner session check failed", error);

    return null;
  }
}
