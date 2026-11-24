import type { Metadata } from "next";

import { requireOwner } from "@/features/auth";
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

/** Owner defaults (FR-ADMIN-27). Each section saves on change. */
export default async function AdminSettingsPage() {
  const session = await requireOwner();
  const background = await (
    await getEditorBackgroundService()
  ).getDefault(session);

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
            Default for every post. A post’s own choice overrides it.
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
    </div>
  );
}
