import { getDatabase } from "@/lib/db";

interface DatabaseClockRow {
  serverTime: Date;
}

export async function readDatabaseClock() {
  const database = getDatabase();
  const [row] = await database.$queryRaw<DatabaseClockRow[]>`
    SELECT NOW() AS "serverTime"
  `;

  if (!row) {
    throw new Error("Database clock query returned no rows.");
  }

  return row.serverTime;
}
