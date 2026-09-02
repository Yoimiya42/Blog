import { randomUUID } from "node:crypto";

import { getDatabase } from "../src/lib/db";
import { getOwnerEnvironment } from "../src/lib/env";

async function seed() {
  const database = getDatabase();
  const { OWNER_EMAIL } = getOwnerEnvironment();

  const existingOwner = await database.user.findUnique({
    where: { email: OWNER_EMAIL },
  });

  if (!existingOwner) {
    await database.user.create({
      data: {
        id: randomUUID(),
        name: "Spike Owner",
        email: OWNER_EMAIL,
      },
    });
  }

  await database.$disconnect();
  console.log("Preview owner prepared.");
}

seed().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Database seed failed.",
  );
  process.exitCode = 1;
});
