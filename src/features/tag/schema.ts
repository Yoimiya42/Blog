export interface Tag {
  id: string;
  slug: string;
  name: string;
}

export class TagSlugTakenError extends Error {
  constructor(readonly slug: string) {
    super(`tag slug is already in use: ${slug}`);
    this.name = "TagSlugTakenError";
  }
}

export const TAG_NAME_MAX_LENGTH = 40;
export const TAGS_PER_POST_MAX = 10;

/**
 * URL slug for a tag name. Keeps letters and digits of any script, so a
 * Chinese tag stays readable in the address; whitespace becomes a hyphen and
 * other punctuation is dropped. Empty when the name has no letter or digit.
 */
export function toTagSlug(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_]+/gu, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export type TagNamesResult =
  { ok: true; names: string[] } | { ok: false; message: string };

/**
 * Parses the owner's comma-separated tag field. Accepts ASCII and full-width
 * commas, trims names, and drops repeats that map to the same slug.
 */
export function parseTagNames(raw: string): TagNamesResult {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const part of raw.split(/[,，、]/u)) {
    const name = part.replace(/\s+/gu, " ").trim();
    if (name === "") continue;
    if (name.length > TAG_NAME_MAX_LENGTH) {
      return {
        ok: false,
        message: `Each tag must be at most ${TAG_NAME_MAX_LENGTH} characters.`,
      };
    }
    const slug = toTagSlug(name);
    if (slug === "") {
      return {
        ok: false,
        message: `"${name}" needs at least one letter or number.`,
      };
    }
    if (seen.has(slug)) continue;
    seen.add(slug);
    names.push(name);
  }

  if (names.length > TAGS_PER_POST_MAX) {
    return {
      ok: false,
      message: `Use at most ${TAGS_PER_POST_MAX} tags.`,
    };
  }

  return { ok: true, names };
}
