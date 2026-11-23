import { requireOwner } from "@/features/auth";
import { createBlankDraftAction, NewDraftLauncher } from "@/features/post";

/** New post opens a stored blank draft (FR-ADMIN-23, ADR-0030). */
export default async function NewPostPage() {
  await requireOwner();

  return <NewDraftLauncher create={createBlankDraftAction} />;
}
