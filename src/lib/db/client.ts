/**
 * The only access point to the D1 binding. ESLint restricts this module to
 * `*.repository.ts` files.
 */
export async function getDatabase(): Promise<D1Database> {
  // Loaded lazily: the module exists only in the Workers runtime.
  const { env } = await import("cloudflare:workers");

  return env.DB;
}
