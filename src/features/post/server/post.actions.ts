"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwner } from "@/features/auth";
import { setFlash } from "@/lib/flash";

import {
  formatTagNames,
  fromPostVersion,
  toPostVersion,
  type PostFieldErrors,
  type PostMutationResult,
} from "../schema";
import { getPostService } from "./post.service";

const POSTS_PATH = "/admin/posts";

const FIX_FIELDS = "Fix the highlighted fields and save again.";
const POST_GONE = "This post no longer exists.";
const POST_CHANGED =
  "This post changed in another tab or window. Reload the page before saving again.";
const LIST_STALE =
  "This post changed in another tab or window. Reload the list and try again.";

export interface PostFormValues {
  title: string;
  slug: string;
  summary: string;
  /** Comma-separated tag names. */
  tags: string;
}

export interface PostFormState {
  values: PostFormValues;
  fieldErrors: PostFieldErrors;
  formError?: string;
  saved?: boolean;
  /** Version token of the stored post after a successful write. */
  version?: string;
}

export type AutosaveResponse =
  | { ok: true; version: string }
  | { ok: false; reason: "invalid" | "not_found" | "conflict" | "not_draft" };

/** A forged request can send files or repeat a field; treat those as blank. */
function readText(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

type SubmittedContent =
  { ok: true; content: unknown | undefined } | { ok: false };

/**
 * The editor submits the document as a JSON string. An absent field keeps the
 * stored document: the form omits it when the stored content cannot be opened.
 * Only the syntax is checked here; the service validates the schema.
 */
function readContent(formData: FormData): SubmittedContent {
  const raw = readText(formData, "content");
  if (raw === "") return { ok: true, content: undefined };

  try {
    return { ok: true, content: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

/**
 * Public reads are refreshed through the framework cache API. An in-memory
 * event bus would reach only the Worker isolate that handled the write. The
 * layout scope covers the list, each post, and the tag archives under `/blog`.
 */
function revalidatePublicReads(): void {
  revalidatePath("/");
  // Covers the list, each post, and the tag archives under /blog/tags.
  revalidatePath("/blog", "layout");
}

type FailedMutation = Exclude<PostMutationResult, { ok: true }>;

function failure(
  values: PostFormValues,
  result: FailedMutation,
): PostFormState {
  if (result.reason === "invalid") {
    return { values, fieldErrors: result.fieldErrors, formError: FIX_FIELDS };
  }

  return {
    values,
    fieldErrors: {},
    formError: result.reason === "conflict" ? POST_CHANGED : POST_GONE,
  };
}

/**
 * Creates a post when `postId` is null, otherwise updates it. `postId` is
 * bound on the client, so it is untrusted: the service decides what exists.
 * The `publish` intent saves first, so the published version is the one on
 * screen.
 */
export async function savePostAction(
  postId: string | null,
  _previous: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const session = await requireOwner();
  const service = await getPostService();

  const values: PostFormValues = {
    title: readText(formData, "title"),
    slug: readText(formData, "slug"),
    summary: readText(formData, "summary"),
    tags: readText(formData, "tags"),
  };

  const intent = readText(formData, "intent");
  const ifUpdatedAt = fromPostVersion(formData.get("version"));

  // Every write to an existing post is conditional. Without a token the
  // repository would drop the check and could overwrite a newer version.
  if (postId !== null && !ifUpdatedAt) {
    return failure(values, { ok: false, reason: "conflict" });
  }
  const condition = { ifUpdatedAt };

  // Unpublishing writes no field, so unsaved or invalid input cannot block it.
  if (postId !== null && intent === "unpublish") {
    const unpublished = await service.unpublish(session, postId, condition);
    if (!unpublished.ok) return failure(values, unpublished);

    revalidatePath(POSTS_PATH);
    revalidatePublicReads();
    await setFlash("Unpublished");
    // A fresh render shows the new status and carries the new token.
    redirect(`${POSTS_PATH}/${postId}`);
  }

  const submitted = readContent(formData);
  if (!submitted.ok) {
    return {
      values,
      fieldErrors: { content: "The article content could not be read." },
      formError: FIX_FIELDS,
    };
  }

  // The key is left out, not set to undefined, when no document was sent.
  // A request without the tag field keeps the stored tags instead of
  // clearing them.
  const { tags, ...fields } = values;
  const input = {
    ...fields,
    ...(formData.has("tags") ? { tags } : {}),
    // Same rule for the cover: absent keeps it, blank removes it.
    ...(formData.has("coverId")
      ? { coverId: readText(formData, "coverId") || null }
      : {}),
    // And for the pin: absent keeps it.
    ...(formData.has("pinned")
      ? { pinned: readText(formData, "pinned") === "true" }
      : {}),
    ...(submitted.content === undefined ? {} : { content: submitted.content }),
  };

  const result =
    postId === null
      ? await service.create(session, input)
      : await service.update(session, postId, input, condition);

  if (!result.ok) return failure(values, result);

  const { post } = result;
  const stored: PostFormValues = {
    title: post.title,
    slug: post.slug,
    summary: post.summary ?? "",
    tags: result.tags ? formatTagNames(result.tags) : values.tags,
  };

  revalidatePath(POSTS_PATH);
  // redirect() throws, so it stays outside any try block.
  if (postId === null) {
    await setFlash("Draft created");
    redirect(`${POSTS_PATH}/${post.id}`);
  }

  if (intent === "publish") {
    // The token pins the publication to the version saved above.
    const published = await service.publish(session, post.id, {
      ifUpdatedAt: post.updatedAt,
    });
    if (!published.ok) {
      const failed = failure(stored, published);

      // The save itself succeeded, so the form keeps the new token.
      return {
        ...failed,
        formError: `Saved, but not published. ${failed.formError}`,
        version: toPostVersion(post.updatedAt),
      };
    }

    revalidatePublicReads();
    await setFlash("Published");
    // A fresh render shows the new status and carries the new token.
    redirect(`${POSTS_PATH}/${post.id}`);
  }

  if (post.status === "PUBLISHED") revalidatePublicReads();

  return {
    values: stored,
    fieldErrors: {},
    saved: true,
    version: toPostVersion(post.updatedAt),
  };
}

/**
 * Saves the document, and the title when given, of a draft in the
 * background. Called directly from the client, so every argument is untrusted.
 */
export async function autosavePostAction(
  postId: string,
  version: string,
  content: string,
  title?: string,
): Promise<AutosaveResponse> {
  const session = await requireOwner();

  const ifUpdatedAt = fromPostVersion(version);
  if (
    typeof postId !== "string" ||
    typeof content !== "string" ||
    (title !== undefined && typeof title !== "string") ||
    !ifUpdatedAt
  ) {
    return { ok: false, reason: "invalid" };
  }

  let document: unknown;
  try {
    document = JSON.parse(content);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const service = await getPostService();
  const result =
    title === undefined
      ? await service.autosave(session, postId, document, ifUpdatedAt)
      : await service.autosave(session, postId, document, ifUpdatedAt, title);

  // No revalidation: a draft has no public read, and refreshing the admin
  // route every few seconds would re-render the page under the editor.
  return result.ok
    ? { ok: true, version: toPostVersion(result.updatedAt) }
    : { ok: false, reason: result.reason };
}

export type UnpublishResponse = { ok: true } | { ok: false; message: string };

/**
 * Unpublishes from the post list row menu (FR-ADMIN-20). The row's version
 * token makes it conditional, so a post edited elsewhere is not withdrawn
 * unseen.
 */
export async function unpublishPostAction(
  postId: string,
  version: string,
): Promise<UnpublishResponse> {
  const session = await requireOwner();

  const ifUpdatedAt = fromPostVersion(version);
  if (typeof postId !== "string" || !ifUpdatedAt) {
    return { ok: false, message: LIST_STALE };
  }

  const result = await (
    await getPostService()
  ).unpublish(session, postId, { ifUpdatedAt });
  if (!result.ok) {
    return {
      ok: false,
      message: result.reason === "not_found" ? POST_GONE : LIST_STALE,
    };
  }

  revalidatePath(POSTS_PATH);
  revalidatePublicReads();
  return { ok: true };
}

/** New post (ADR-0030): opens a stored blank draft in the editor. */
export async function createBlankDraftAction(): Promise<void> {
  const session = await requireOwner();
  const post = await (await getPostService()).createBlankDraft(session);

  revalidatePath(POSTS_PATH);
  redirect(`${POSTS_PATH}/${post.id}`);
}

export async function deletePostAction(postId: string): Promise<void> {
  const session = await requireOwner();
  const service = await getPostService();

  // An already deleted post still ends at the list: the outcome is the same.
  await service.remove(session, postId);

  revalidatePath(POSTS_PATH);
  // The post may have been public; the refresh is cheap when it was not.
  revalidatePublicReads();
  await setFlash("Post deleted");
  redirect(POSTS_PATH);
}

/** What the command palette searches (FR-ADMIN-17). Serialisable. */
export interface PostCommandItem {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
}

/** Read on each palette open, so the list is never stale. */
export async function listPostsForCommandAction(): Promise<PostCommandItem[]> {
  const session = await requireOwner();
  const groups = await (await getPostService()).listByStatus(session);

  return [...groups.DRAFT, ...groups.PUBLISHED].map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
  }));
}
