"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwner } from "@/features/auth";
import { setFlash } from "@/lib/flash";

import {
  fromMomentVersion,
  type MomentFieldErrors,
  type MomentInput,
  type MomentMutationResult,
} from "../schema";
import { getMomentService } from "./moment.service";

const ADMIN_PATH = "/admin/moments";

const MOMENT_GONE = "This moment no longer exists.";
const MOMENT_CHANGED =
  "This moment changed in another tab or window. Reload the page before saving again.";

export interface MomentFormState {
  fieldErrors: MomentFieldErrors;
  formError?: string;
  /** Increases on each successful post, so the composer can reset. */
  posted?: number;
}

/** A forged request can send files or repeat a field; treat those as blank. */
function readText(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

/** The composer sends the ordered image ids as a JSON array. */
function readInput(formData: FormData): MomentInput {
  let mediaIds: unknown = null;
  try {
    mediaIds = JSON.parse(readText(formData, "mediaIds") || "[]");
  } catch {
    // Left null: the service reports the field.
  }

  return { body: readText(formData, "body"), mediaIds };
}

function revalidateMoments(): void {
  revalidatePath("/moments");
  revalidatePath(ADMIN_PATH, "layout");
}

function failure(
  result: Exclude<MomentMutationResult, { ok: true }>,
): MomentFormState {
  if (result.reason === "invalid") return { fieldErrors: result.fieldErrors };

  return {
    fieldErrors: {},
    formError: result.reason === "conflict" ? MOMENT_CHANGED : MOMENT_GONE,
  };
}

/** Posting publishes at once: moments have no draft (ADR-0036). */
export async function createMomentAction(
  previous: MomentFormState,
  formData: FormData,
): Promise<MomentFormState> {
  const session = await requireOwner();
  const service = await getMomentService();

  const result = await service.create(session, readInput(formData));
  if (!result.ok) return failure(result);

  revalidateMoments();
  return { fieldErrors: {}, posted: (previous.posted ?? 0) + 1 };
}

/**
 * `momentId` is bound on the client, so it is untrusted: the service decides
 * what exists. Every edit carries the version the owner opened.
 */
export async function updateMomentAction(
  momentId: string,
  _previous: MomentFormState,
  formData: FormData,
): Promise<MomentFormState> {
  const session = await requireOwner();
  const service = await getMomentService();

  const ifUpdatedAt = fromMomentVersion(formData.get("version"));
  if (!ifUpdatedAt) return failure({ ok: false, reason: "conflict" });

  const result = await service.update(
    session,
    momentId,
    readInput(formData),
    ifUpdatedAt,
  );
  if (!result.ok) return failure(result);

  revalidateMoments();
  await setFlash("Moment updated.");
  redirect(ADMIN_PATH);
}

/** Returns the message the list shows; the caller stays on its page. */
export async function deleteMomentAction(
  momentId: string,
): Promise<{ ok: boolean; message: string }> {
  const session = await requireOwner();
  const service = await getMomentService();

  const deleted = await service.remove(session, momentId);
  revalidateMoments();

  return deleted
    ? { ok: true, message: "Moment deleted." }
    : { ok: false, message: MOMENT_GONE };
}
