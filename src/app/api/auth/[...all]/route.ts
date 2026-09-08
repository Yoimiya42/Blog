import { createAuth } from "@/lib/auth";
import { createResendMailAdapter } from "@/lib/mail";

async function handleAuthRequest(request: Request) {
  const { env } = await import("cloudflare:workers");
  const auth = createAuth({
    baseURL: new URL(request.url).origin,
    database: env.DB,
    mail: createResendMailAdapter({
      apiKey: env.RESEND_API_KEY,
      from: env.AUTH_EMAIL_FROM,
    }),
    ownerEmail: env.OWNER_EMAIL,
    secret: env.BETTER_AUTH_SECRET,
  });

  return auth.handler(request);
}

export { handleAuthRequest as GET, handleAuthRequest as POST };
