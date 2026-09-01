import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export function parseEnvironment(input: { NODE_ENV?: string }) {
  return environmentSchema.parse(input);
}

export const env = parseEnvironment({
  NODE_ENV: process.env.NODE_ENV,
});
