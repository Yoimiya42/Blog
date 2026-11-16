const SEND_OTP_PATH = "/email-otp/send-verification-otp";

const MAIL_SETTINGS = [
  "OWNER_EMAIL",
  "RESEND_API_KEY",
  "AUTH_EMAIL_FROM",
] as const;

type MailSettings = Partial<
  Record<(typeof MAIL_SETTINGS)[number], string | undefined>
>;

/**
 * Rejects a sign-in code request when the Worker cannot send mail at all.
 *
 * Better Auth swallows send errors and reports success, so a Worker without
 * mail settings would show "Enter your code" for an email that never left.
 * The check ignores the submitted address: every caller gets the same answer,
 * so it reveals nothing about which address belongs to the owner.
 *
 * Returns null when the request may proceed.
 */
export function guardOtpSend(
  request: Request,
  settings: MailSettings,
): Response | null {
  if (
    request.method !== "POST" ||
    !new URL(request.url).pathname.endsWith(SEND_OTP_PATH)
  ) {
    return null;
  }

  const missing = MAIL_SETTINGS.filter((name) => !settings[name]?.trim());

  if (missing.length === 0) {
    return null;
  }

  console.error(
    JSON.stringify({ event: "auth.otp.mail_unconfigured", missing }),
  );

  return Response.json(
    { message: "Sign-in email is unavailable." },
    { status: 503 },
  );
}

/** Reads the Worker settings and applies {@link guardOtpSend}. */
export async function guardRequestOtpSend(
  request: Request,
): Promise<Response | null> {
  // Loaded lazily: the module exists only in the Workers runtime.
  const { env } = await import("cloudflare:workers");

  return guardOtpSend(request, env);
}
