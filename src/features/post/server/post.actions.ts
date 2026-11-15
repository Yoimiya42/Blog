"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwner } from "@/features/auth";

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
  const condition = { ifUpdatedAt: fromPostVersion(formData.get("version")) };

  // Unpublishing writes no field, so unsaved or invalid input cannot block it.
  if (postId !== null && intent === "unpublish") {
    const unpublished = await service.unpublish(session, postId, condition);
    if (!unpublished.ok) return failure(values, unpublished);

    revalidatePath(POSTS_PATH);
    revalidatePublicReads();
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
  if (postId === null) redirect(`${POSTS_PATH}/${post.id}`);

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
 * Saves the document of a draft in the background. Called directly from the
 * client, so every argument is untrusted.
 */
export async function autosavePostAction(
  postId: string,
  version: string,
  content: string,
): Promise<AutosaveResponse> {
  const session = await requireOwner();

  const ifUpdatedAt = fromPostVersion(version);
  if (
    typeof postId !== "string" ||
    typeof content !== "string" ||
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
  const result = await service.autosave(session, postId, document, ifUpdatedAt);

  // No revalidation: a draft has no public read, and refreshing the admin
  // route every few seconds would re-render the page under the editor.
  return result.ok
    ? { ok: true, version: toPostVersion(result.updatedAt) }
    : { ok: false, reason: result.reason };
}

export async function deletePostAction(postId: string): Promise<void> {
  const session = await requireOwner();
  const service = await getPostService();

  // An already deleted post still ends at the list: the outcome is the same.
  await service.remove(session, postId);

  revalidatePath(POSTS_PATH);
  // The post may have been public; the refresh is cheap when it was not.
  revalidatePublicReads();
  redirect(POSTS_PATH);
}
