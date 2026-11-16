import { createRequestAuth, guardRequestOtpSend } from "@/features/auth";

async function handleAuthRequest(request: Request) {
  const rejection = await guardRequestOtpSend(request);

  if (rejection) {
    return rejection;
  }

  const auth = await createRequestAuth(new URL(request.url).origin);

  return auth.handler(request);
}

export { handleAuthRequest as GET, handleAuthRequest as POST };
