import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
});

const ownerEnvironmentSchema = z.object({
  OWNER_EMAIL: z.string().email(),
});

const authEnvironmentSchema = ownerEnvironmentSchema.extend({
  BETTER_AUTH_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().startsWith("re_"),
  AUTH_EMAIL_FROM: z.string().min(3),
});

export function parseEnvironment(input: { NODE_ENV?: string }) {
  return environmentSchema.parse(input);
}

export const env = parseEnvironment({
  NODE_ENV: process.env.NODE_ENV,
});

export function parseDatabaseEnvironment(input: { DATABASE_URL?: string }) {
  return databaseEnvironmentSchema.parse(input);
}

export function getDatabaseEnvironment() {
  return parseDatabaseEnvironment({
    DATABASE_URL: process.env.DATABASE_URL,
  });
}

export function parseOwnerEnvironment(input: { OWNER_EMAIL?: string }) {
  return ownerEnvironmentSchema.parse(input);
}

export function getOwnerEnvironment() {
  return parseOwnerEnvironment({
    OWNER_EMAIL: process.env.OWNER_EMAIL,
  });
}

export function parseAuthEnvironment(input: {
  OWNER_EMAIL?: string;
  BETTER_AUTH_SECRET?: string;
  RESEND_API_KEY?: string;
  AUTH_EMAIL_FROM?: string;
}) {
  return authEnvironmentSchema.parse(input);
}

export function getAuthEnvironment() {
  return parseAuthEnvironment({
    OWNER_EMAIL: process.env.OWNER_EMAIL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM,
  });
}
