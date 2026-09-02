import { prismaAdapter } from "@better-auth/prisma-adapter";

import { getDatabase } from "@/lib/db";

export function createAuthDatabaseAdapter() {
  return prismaAdapter(getDatabase(), {
    provider: "postgresql",
  });
}
