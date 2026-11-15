/**
 * Parses `?page=`. Absent means page 1; anything other than a plain positive
 * integer is NaN, which the service treats as out of range (404).
 */
export function parsePageNumber(raw: string | string[] | undefined): number {
  if (raw === undefined) return 1;
  if (typeof raw !== "string" || !/^[1-9]\d{0,5}$/.test(raw)) return Number.NaN;

  return Number(raw);
}
