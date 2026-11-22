export function normalizeOwnerEmail(input: unknown): string;
export function buildOwnerSeedSql(input: unknown): string;
export function resolveDatabase(argv: readonly string[]): string;
export function resolveOwnerEmail(
  argv: readonly string[],
  env: { OWNER_EMAIL?: string },
  loadLocalEnv: () => void,
): string | undefined;
