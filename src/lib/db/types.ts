/** Application-managed timestamp column: INTEGER epoch milliseconds. */
export type EpochMilliseconds = number;

export function toEpochMilliseconds(date: Date): EpochMilliseconds {
  return date.getTime();
}

export function fromEpochMilliseconds(value: EpochMilliseconds): Date {
  return new Date(value);
}

/**
 * D1 surfaces SQLite constraint failures only through the error message.
 * `column` is `table.column`, as SQLite names it in that message.
 */
export function isUniqueViolation(error: unknown, column: string): boolean {
  return (
    error instanceof Error &&
    error.message.includes(`UNIQUE constraint failed: ${column}`)
  );
}

/**
 * D1 rejects statements with more than 100 bound parameters. Repositories
 * that expand an id list into placeholders must stay under this limit.
 */
export const MAX_BOUND_PARAMETERS = 100;

export function placeholders(count: number): string {
  if (count < 1 || count > MAX_BOUND_PARAMETERS) {
    throw new RangeError(
      `expected 1 to ${MAX_BOUND_PARAMETERS} bound parameters, got ${count}`,
    );
  }

  return Array.from({ length: count }, () => "?").join(", ");
}
