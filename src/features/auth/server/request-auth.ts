import { createAuth } from "@/lib/auth";
import { createResendMailAdapter } from "@/lib/mail";

export async function createRequestAuth(origin: string) {
  // Loaded lazily: the module exists only in the Workers runtime.
  const { env } = await import("cloudflare:workers");

  return createAuth({
    baseURL: origin,
    database: env.DB,
    mail: createResendMailAdapter({
      apiKey: env.RESEND_API_KEY,
      from: env.AUTH_EMAIL_FROM,
    }),
    ownerEmail: env.OWNER_EMAIL,
    secret: env.BETTER_AUTH_SECRET,
  });
}
