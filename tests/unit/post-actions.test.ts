import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOwner = vi.fn();
const service = {
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};
const getPostService = vi.fn();
const revalidatePath = vi.fn();

class NotFoundSignal extends Error {}
class RedirectSignal extends Error {
  constructor(readonly path: string) {
    super(path);
  }
}

vi.mock("@/features/auth", () => ({ requireOwner: () => requireOwner() }));
vi.mock("@/features/post/server/post.service", () => ({
  getPostService: () => getPostService(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => revalidatePath(path),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new RedirectSignal(path);
  },
}));

import {
  deletePostAction,
  savePostAction,
  type PostFormState,
} from "@/features/post/server/post.actions";

const SESSION = { user: { role: "OWNER" } };
const PREVIOUS: PostFormState = {
  values: { title: "", slug: "", summary: "" },
  fieldErrors: {},
};

function form(fields: Record<string, string | Blob>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.append(name, value);
  }

  return formData;
}

const VALID = { title: "Hello", slug: "hello", summary: "Short." };

beforeEach(() => {
  requireOwner.mockResolvedValue(SESSION);
  getPostService.mockResolvedValue(service);
});

describe("authorisation", () => {
  beforeEach(() => {
    requireOwner.mockRejectedValue(new NotFoundSignal());
  });

  it("stops a save before the service is reached", async () => {
    await expect(
      savePostAction(null, PREVIOUS, form(VALID)),
    ).rejects.toBeInstanceOf(NotFoundSignal);
    await expect(
      savePostAction("post-1", PREVIOUS, form(VALID)),
    ).rejects.toBeInstanceOf(NotFoundSignal);

    expect(getPostService).not.toHaveBeenCalled();
  });

  it("stops a delete before the service is reached", async () => {
    await expect(deletePostAction("post-1")).rejects.toBeInstanceOf(
      NotFoundSignal,
    );

    expect(getPostService).not.toHaveBeenCalled();
  });
});

describe("savePostAction", () => {
  it("creates a post with the owner session and opens it", async () => {
    service.create.mockResolvedValue({ ok: true, post: { id: "post-1" } });

    await expect(
      savePostAction(null, PREVIOUS, form(VALID)),
    ).rejects.toMatchObject({ path: "/admin/posts/post-1" });

    expect(service.create).toHaveBeenCalledWith(SESSION, VALID);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/posts");
  });

  it("updates a post and reports the stored values", async () => {
    service.update.mockResolvedValue({
      ok: true,
      post: { id: "post-1", title: "Hello", slug: "hello", summary: null },
    });

    const state = await savePostAction(
      "post-1",
      PREVIOUS,
      form({ ...VALID, summary: "  " }),
    );

    expect(service.update).toHaveBeenCalledWith(SESSION, "post-1", {
      ...VALID,
      summary: "  ",
    });
    expect(state).toEqual({
      values: { title: "Hello", slug: "hello", summary: "" },
      fieldErrors: {},
      saved: true,
    });
  });

  it("returns field errors with the submitted values", async () => {
    service.create.mockResolvedValue({
      ok: false,
      reason: "invalid",
      fieldErrors: { slug: "Taken." },
    });

    const state = await savePostAction(null, PREVIOUS, form(VALID));

    expect(state).toMatchObject({
      values: VALID,
      fieldErrors: { slug: "Taken." },
      formError: expect.any(String),
    });
    expect(state.saved).toBeUndefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reports a post deleted since the form opened", async () => {
    service.update.mockResolvedValue({ ok: false, reason: "not_found" });

    const state = await savePostAction("post-1", PREVIOUS, form(VALID));

    expect(state).toMatchObject({
      fieldErrors: {},
      formError: "This post no longer exists.",
    });
  });

  it("treats missing and file fields as blank", async () => {
    service.create.mockResolvedValue({
      ok: false,
      reason: "invalid",
      fieldErrors: { title: "Title is required." },
    });

    await savePostAction(
      null,
      PREVIOUS,
      form({ title: new Blob(["x"]), slug: "hello" }),
    );

    expect(service.create).toHaveBeenCalledWith(SESSION, {
      title: "",
      slug: "hello",
      summary: "",
    });
  });
});

describe("deletePostAction", () => {
  it("deletes with the owner session and returns to the list", async () => {
    service.remove.mockResolvedValue(true);

    await expect(deletePostAction("post-1")).rejects.toMatchObject({
      path: "/admin/posts",
    });

    expect(service.remove).toHaveBeenCalledWith(SESSION, "post-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/posts");
  });
});
