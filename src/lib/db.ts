import { PrismaNeonHttp } from "@prisma/adapter-neon";

import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseEnvironment } from "@/lib/env";

const globalDatabase = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export function getDatabase() {
  if (globalDatabase.prisma) {
    return globalDatabase.prisma;
  }

  const { DATABASE_URL } = getDatabaseEnvironment();
  const adapter = new PrismaNeonHttp(DATABASE_URL, {});
  const prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalDatabase.prisma = prisma;
  }

  return prisma;
}
