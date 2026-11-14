"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwner } from "@/features/auth";

import type { PostFieldErrors } from "../schema";
import { getPostService } from "./post.service";

const POSTS_PATH = "/admin/posts";

export interface PostFormValues {
  title: string;
  slug: string;
  summary: string;
}

export interface PostFormState {
  values: PostFormValues;
  fieldErrors: PostFieldErrors;
  formError?: string;
  saved?: boolean;
}

/** A forged request can send files or repeat a field; treat those as blank. */
function readText(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

/**
 * Creates a post when `postId` is null, otherwise updates it. `postId` is
 * bound on the client, so it is untrusted: the service decides what exists.
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
  };

  const result =
    postId === null
      ? await service.create(session, values)
      : await service.update(session, postId, values);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return {
        values,
        fieldErrors: {},
        formError: "This post no longer exists.",
      };
    }

    return {
      values,
      fieldErrors: result.fieldErrors,
      formError: "Fix the highlighted fields and save again.",
    };
  }

  revalidatePath(POSTS_PATH);
  // redirect() throws, so it stays outside any try block.
  if (postId === null) redirect(`${POSTS_PATH}/${result.post.id}`);

  return {
    values: {
      title: result.post.title,
      slug: result.post.slug,
      summary: result.post.summary ?? "",
    },
    fieldErrors: {},
    saved: true,
  };
}

export async function deletePostAction(postId: string): Promise<void> {
  const session = await requireOwner();
  const service = await getPostService();

  // An already deleted post still ends at the list: the outcome is the same.
  await service.remove(session, postId);

  revalidatePath(POSTS_PATH);
  redirect(POSTS_PATH);
}
