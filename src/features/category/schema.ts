/** A post category from the owner's list (FR-BLOG-18, FR-ADMIN-30). */
export interface Category {
  id: string;
  name: string;
}

/** A category with the number of non-deleted posts that use it. */
export interface CategoryUsage extends Category {
  posts: number;
}

export const CATEGORY_NAME_MAX_LENGTH = 20;

export class CategoryNameTakenError extends Error {
  constructor(readonly categoryName: string) {
    super(`category name is already in use: ${categoryName}`);
    this.name = "CategoryNameTakenError";
  }
}

export class CategoryAccessDeniedError extends Error {
  constructor() {
    super("category management requires the owner");
    this.name = "CategoryAccessDeniedError";
  }
}

export type CategoryNameResult =
  { ok: true; name: string } | { ok: false; message: string };

/** Trims and collapses whitespace; rejects blank and overlong names. */
export function parseCategoryName(raw: unknown): CategoryNameResult {
  const name = typeof raw === "string" ? raw.replace(/\s+/gu, " ").trim() : "";
  if (name === "") return { ok: false, message: "Enter a category name." };
  if (name.length > CATEGORY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Use at most ${CATEGORY_NAME_MAX_LENGTH} characters.`,
    };
  }

  return { ok: true, name };
}

export type CategoryMutationResult =
  { ok: true; category: Category } | { ok: false; message: string };

export type CategoryDeleteResult =
  { ok: true } | { ok: false; message: string };
