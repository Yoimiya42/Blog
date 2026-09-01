import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export const env = environmentSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
});