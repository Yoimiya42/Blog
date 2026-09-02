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

const r2EnvironmentSchema = z.object({
  R2_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/),
  R2_ACCESS_KEY_ID: z.string().min(16),
  R2_SECRET_ACCESS_KEY: z.string().min(32),
  R2_BUCKET_NAME: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  R2_PUBLIC_BASE_URL: z.string().url().startsWith("https://"),
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

export function parseR2Environment(input: {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_BASE_URL?: string;
}) {
  return r2EnvironmentSchema.parse(input);
}

export function getR2Environment() {
  return parseR2Environment({
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
  });
}
