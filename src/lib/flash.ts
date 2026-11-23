import { cookies } from "next/headers";

/**
 * One-shot message for the next admin render. A Server Action that redirects
 * cannot return state, so it leaves the message in a short-lived cookie and
 * the admin toaster shows and clears it (FR-ADMIN-19).
 */
export const FLASH_COOKIE = "admin-flash";

export async function setFlash(message: string): Promise<void> {
  // The cookie serializer URI-encodes the value; the toaster decodes it.
  (await cookies()).set(FLASH_COOKIE, message, {
    path: "/admin",
    maxAge: 30,
    sameSite: "strict",
    // Read by the client toaster; the message carries no secret.
    httpOnly: false,
  });
}
