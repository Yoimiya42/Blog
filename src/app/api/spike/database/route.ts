import { readDatabaseClock } from "@/features/spike";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = performance.now();

  try {
    const serverTime = await readDatabaseClock();

    return Response.json({
      ok: true,
      provider: "neon-postgresql",
      serverTime: serverTime.toISOString(),
      durationMs: Math.round(performance.now() - startedAt),
    });
  } catch {
    return Response.json(
      {
        ok: false,
        provider: "neon-postgresql",
        error: "Database probe failed.",
      },
      { status: 503 },
    );
  }
}
