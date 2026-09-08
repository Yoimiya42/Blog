import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";

import type { MailAdapter } from "@/lib/mail";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const OTP_EXPIRY_SECONDS = 60 * 10;

interface AuthDependencies {
  database: D1Database;
  mail: MailAdapter;
  ownerEmail: string;
  secret: string;
}

export function createAuth({
  database,
  mail,
  ownerEmail,
  secret,
}: AuthDependencies) {
  return betterAuth({
    database,
    secret,

    user: {
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      additionalFields: {
        role: {
          type: ["VISITOR", "OWNER"],
          required: true,
          defaultValue: "VISITOR",
          input: false,
        },
      },
    },

    session: {
      expiresIn: SESSION_DURATION_SECONDS,
      fields: {
        userId: "user_id",
        expiresAt: "expires_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },

    account: {
      fields: {
        userId: "user_id",
        accountId: "account_id",
        providerId: "provider_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },

    verification: {
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },

    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rate_limit",
      fields: {
        lastRequest: "last_request",
      },
    },

    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: OTP_EXPIRY_SECONDS,
        allowedAttempts: 5,
        disableSignUp: true,
        storeOTP: "hashed",

        async sendVerificationOTP({ email, otp, type }) {
          if (
            type !== "sign-in" ||
            email.toLowerCase() !== ownerEmail.toLowerCase()
          ) {
            return;
          }

          await mail.send({
            to: email,
            subject: "Your sign-in code",
            text: `${otp}\n\nExpires in ${OTP_EXPIRY_SECONDS / 60} minutes.`,
          });
        },
      }),
    ],
  });
}
