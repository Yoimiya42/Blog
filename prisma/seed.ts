import { randomUUID } from "node:crypto";

import { getDatabase } from "../src/lib/db";
import { getOwnerEnvironment } from "../src/lib/env";

async function seed() {
  const database = getDatabase();
  const { OWNER_EMAIL } = getOwnerEnvironment();

  await database.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: {
      id: randomUUID(),
      name: "Spike Owner",
      email: OWNER_EMAIL,
    },
  });

  await database.$disconnect();
  console.log("Preview owner prepared.");
}

seed().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Database seed failed.",
  );
  process.exitCode = 1;
});
