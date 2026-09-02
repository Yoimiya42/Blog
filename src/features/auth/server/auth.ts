import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";

import { getAuthEnvironment } from "@/lib/env";
import { createResendMailAdapter } from "@/lib/mail";

import { createAuthDatabaseAdapter } from "./auth.repository";

const OTP_EXPIRY_SECONDS = 5 * 60;
const SESSION_EXPIRY_SECONDS = 30 * 24 * 60 * 60;

function createAuth() {
  const { BETTER_AUTH_SECRET, RESEND_API_KEY, AUTH_EMAIL_FROM } =
    getAuthEnvironment();
  const mail = createResendMailAdapter({
    apiKey: RESEND_API_KEY,
    from: AUTH_EMAIL_FROM,
  });

  return betterAuth({
    secret: BETTER_AUTH_SECRET,
    database: createAuthDatabaseAdapter(),
    session: {
      expiresIn: SESSION_EXPIRY_SECONDS,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: OTP_EXPIRY_SECONDS,
        allowedAttempts: 3,
        disableSignUp: true,
        storeOTP: "hashed",
        rateLimit: {
          window: 60,
          max: 3,
        },
        async sendVerificationOTP({ email, otp }) {
          await mail.send({
            to: email,
            subject: "Your Blog sign-in code",
            text: `Your sign-in code is ${otp}. It expires in five minutes.`,
            html: `<p>Your sign-in code is <strong>${otp}</strong>.</p><p>It expires in five minutes.</p>`,
          });
        },
      }),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;

let auth: Auth | undefined;

export function getAuth(): Auth {
  auth ??= createAuth();
  return auth;
}
