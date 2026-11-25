import type { Metadata } from "next";

import { requireOwner } from "@/features/auth";
import {
  CategoryManager,
  createCategoryAction,
  deleteCategoryAction,
  getCategoryService,
  renameCategoryAction,
} from "@/features/category";
import {
  EDITOR_BACKGROUND_OPACITIES,
  getEditorBackgroundService,
  listMediaForPickerAction,
  MEDIA_UPLOAD_CONFIG,
  updateDefaultEditorBackgroundAction,
} from "@/features/media";
import { EditorBackgroundSettings } from "@/features/post";

export const metadata: Metadata = {
  title: "Settings",
};

/** Owner defaults (FR-ADMIN-27) and categories (FR-ADMIN-30). */
export default async function AdminSettingsPage() {
  const session = await requireOwner();
  const [background, categories] = await Promise.all([
    getEditorBackgroundService().then((service) => service.getDefault(session)),
    getCategoryService().then((service) => service.list(session)),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <section
        aria-labelledby="settings-editor"
        className="mt-8 grid gap-6 rounded-card bg-card p-5 ring-1 ring-border md:grid-cols-[minmax(0,1fr)_20rem] md:p-6"
      >
        <div>
          <h2 className="text-lg font-semibold" id="settings-editor">
            Editor
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            The background every post opens with. A post changed from its editor
            keeps its own choice until you reset it there.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium">Default background</h3>
          <EditorBackgroundSettings
            config={{
              initial: background,
              opacities: EDITOR_BACKGROUND_OPACITIES,
              save: updateDefaultEditorBackgroundAction,
            }}
            imageUpload={{
              ...MEDIA_UPLOAD_CONFIG,
              loadLibrary: listMediaForPickerAction,
            }}
          />
        </div>
      </section>

      <section
        aria-labelledby="settings-categories"
        className="mt-6 grid gap-6 rounded-card bg-card p-5 ring-1 ring-border md:grid-cols-[minmax(0,1fr)_20rem] md:p-6"
      >
        <div>
          <h2 className="text-lg font-semibold" id="settings-categories">
            Categories
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Every post belongs to one. Keep the list short; topics belong in
            tags. A category in use cannot be deleted.
          </p>
        </div>

        <CategoryManager
          actions={{
            create: createCategoryAction,
            rename: renameCategoryAction,
            remove: deleteCategoryAction,
          }}
          initial={categories}
        />
      </section>
    </div>
  );
}
