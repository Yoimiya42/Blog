import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
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
