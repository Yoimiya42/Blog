import {
  CategoryAccessDeniedError,
  CategoryNameTakenError,
  parseCategoryName,
  type CategoryDeleteResult,
  type CategoryMutationResult,
  type CategoryUsage,
} from "../schema";
import type { CategoryRepository } from "./category.repository";

/** The session of the caller, or nothing when the request is anonymous. */
export type CategoryActor = { user: { role?: unknown } } | null | undefined;

const NAME_TAKEN = "Another category already has this name.";
const NOT_FOUND = "This category no longer exists.";

function inUse(posts: number): string {
  return posts === 1
    ? "1 post uses this category. Move it to another category first."
    : `${posts} posts use this category. Move them to another category first.`;
}

interface CategoryServiceDependencies {
  categories: CategoryRepository;
  isOwner: (actor: CategoryActor) => boolean;
  now?: () => Date;
  newId?: () => string;
}

/** FR-ADMIN-30: the owner's category list. Every method checks the owner. */
export function createCategoryService({
  categories,
  isOwner,
  now = () => new Date(),
  newId = () => crypto.randomUUID(),
}: CategoryServiceDependencies) {
  function assertOwner(actor: CategoryActor): void {
    if (!isOwner(actor)) throw new CategoryAccessDeniedError();
  }

  async function guardName(
    operation: () => Promise<CategoryMutationResult>,
  ): Promise<CategoryMutationResult> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof CategoryNameTakenError) {
        return { ok: false, message: NAME_TAKEN };
      }
      throw error;
    }
  }

  return {
    async list(actor: CategoryActor): Promise<CategoryUsage[]> {
      assertOwner(actor);

      return categories.listWithUsage();
    },

    async create(
      actor: CategoryActor,
      rawName: unknown,
    ): Promise<CategoryMutationResult> {
      assertOwner(actor);
      const parsed = parseCategoryName(rawName);
      if (!parsed.ok) return parsed;

      return guardName(async () => ({
        ok: true,
        category: await categories.insert(
          { id: newId(), name: parsed.name },
          now(),
        ),
      }));
    },

    async rename(
      actor: CategoryActor,
      id: string,
      rawName: unknown,
    ): Promise<CategoryMutationResult> {
      assertOwner(actor);
      const parsed = parseCategoryName(rawName);
      if (!parsed.ok) return parsed;

      return guardName(async () => {
        const category = await categories.rename(id, parsed.name);

        return category
          ? { ok: true, category }
          : { ok: false, message: NOT_FOUND };
      });
    },

    /** Refused while a non-deleted post uses the category. */
    async remove(
      actor: CategoryActor,
      id: string,
    ): Promise<CategoryDeleteResult> {
      assertOwner(actor);

      const { deleted, posts } = await categories.delete(id);
      if (deleted) return { ok: true };

      return { ok: false, message: posts > 0 ? inUse(posts) : NOT_FOUND };
    },
  };
}

export type CategoryService = ReturnType<typeof createCategoryService>;

export async function getCategoryService(): Promise<CategoryService> {
  // Loaded lazily, like the post service: both need the Workers runtime.
  const [{ getCategoryRepository }, { isOwnerSession }] = await Promise.all([
    import("./category.repository"),
    import("@/features/auth"),
  ]);

  return createCategoryService({
    categories: await getCategoryRepository(),
    isOwner: isOwnerSession,
  });
}
