"use server";

import { revalidatePath } from "next/cache";

import { requireOwner } from "@/features/auth";

import type { CategoryDeleteResult, CategoryMutationResult } from "../schema";
import { getCategoryService, type CategoryService } from "./category.service";

/** Category names show in settings, the editor, and public cards. */
function revalidateCategoryReads(): void {
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/blog", "layout");
}

async function run<T extends { ok: boolean }>(
  operation: (
    service: CategoryService,
    session: Awaited<ReturnType<typeof requireOwner>>,
  ) => Promise<T>,
): Promise<T> {
  const session = await requireOwner();
  const result = await operation(await getCategoryService(), session);
  if (result.ok) revalidateCategoryReads();

  return result;
}

/** FR-ADMIN-30. Arguments come from the client and are untrusted. */
export async function createCategoryAction(
  name: unknown,
): Promise<CategoryMutationResult> {
  return run((service, session) => service.create(session, name));
}

export async function renameCategoryAction(
  id: unknown,
  name: unknown,
): Promise<CategoryMutationResult> {
  return run((service, session) => service.rename(session, String(id), name));
}

export async function deleteCategoryAction(
  id: unknown,
): Promise<CategoryDeleteResult> {
  return run((service, session) => service.remove(session, String(id)));
}
