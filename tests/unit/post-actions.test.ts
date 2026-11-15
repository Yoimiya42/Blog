import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOwner = vi.fn();
const service = {
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  autosave: vi.fn(),
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
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new RedirectSignal(path);
  },
}));

import {
  autosavePostAction,
  deletePostAction,
  savePostAction,
  type PostFormState,
} from "@/features/post/server/post.actions";

const SESSION = { user: { role: "OWNER" } };
const PREVIOUS: PostFormState = {
  values: { title: "", slug: "", summary: "", tags: "" },
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

const SAVED_AT = new Date(2_000);
const STORED = {
  id: "post-1",
  title: "Hello",
  slug: "hello",
  summary: null,
  status: "DRAFT",
  updatedAt: SAVED_AT,
};
const NO_TOKEN = { ifUpdatedAt: undefined };

function expectPublicRevalidation(): void {
  expect(revalidatePath).toHaveBeenCalledWith("/");
  expect(revalidatePath).toHaveBeenCalledWith("/blog", "layout");
}

function expectNoPublicRevalidation(): void {
  expect(revalidatePath).not.toHaveBeenCalledWith("/");
  expect(revalidatePath).not.toHaveBeenCalledWith("/blog", "layout");
}

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

  it("stops an autosave before the service is reached", async () => {
    await expect(
      autosavePostAction("post-1", "1000", "{}"),
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
    service.create.mockResolvedValue({ ok: true, post: STORED });

    await expect(
      savePostAction(null, PREVIOUS, form(VALID)),
    ).rejects.toMatchObject({ path: "/admin/posts/post-1" });

    expect(service.create).toHaveBeenCalledWith(SESSION, VALID);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/posts");
  });

  it("updates a post and reports the stored values", async () => {
    service.update.mockResolvedValue({ ok: true, post: STORED });

    const state = await savePostAction(
      "post-1",
      PREVIOUS,
      form({ ...VALID, summary: "  " }),
    );

    expect(service.update).toHaveBeenCalledWith(
      SESSION,
      "post-1",
      { ...VALID, summary: "  " },
      NO_TOKEN,
    );
    expect(state).toEqual({
      values: { title: "Hello", slug: "hello", summary: "", tags: "" },
      fieldErrors: {},
      saved: true,
      version: "2000",
    });
    expectNoPublicRevalidation();
  });

  it("sends the version token and reports a conflict", async () => {
    service.update.mockResolvedValue({ ok: false, reason: "conflict" });

    const state = await savePostAction(
      "post-1",
      PREVIOUS,
      form({ ...VALID, version: "1000" }),
    );

    expect(service.update).toHaveBeenCalledWith(SESSION, "post-1", VALID, {
      ifUpdatedAt: new Date(1_000),
    });
    expect(state).toMatchObject({
      fieldErrors: {},
      formError: expect.stringContaining("changed"),
    });
    expect(state.saved).toBeUndefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ignores a version field that is not a token", async () => {
    service.update.mockResolvedValue({ ok: true, post: STORED });

    await savePostAction(
      "post-1",
      PREVIOUS,
      form({ ...VALID, version: "1e3" }),
    );

    expect(service.update).toHaveBeenCalledWith(
      SESSION,
      "post-1",
      VALID,
      NO_TOKEN,
    );
  });

  it("refreshes public reads when a published post is saved", async () => {
    service.update.mockResolvedValue({
      ok: true,
      post: { ...STORED, status: "PUBLISHED" },
    });

    await savePostAction("post-1", PREVIOUS, form(VALID));

    expectPublicRevalidation();
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

  it("passes the tag field and reports the stored tag names", async () => {
    service.update.mockResolvedValue({
      ok: true,
      post: STORED,
      tags: [{ id: "t1", slug: "go", name: "Go" }],
    });

    const state = await savePostAction(
      "post-1",
      PREVIOUS,
      form({ ...VALID, tags: "go" }),
    );

    expect(service.update).toHaveBeenCalledWith(
      SESSION,
      "post-1",
      { ...VALID, tags: "go" },
      NO_TOKEN,
    );
    expect(state.values.tags).toBe("Go");
  });

  it("leaves tags out when the request has no tag field", async () => {
    service.update.mockResolvedValue({ ok: true, post: STORED });

    await savePostAction("post-1", PREVIOUS, form(VALID));

    expect(service.update.mock.calls[0]?.[2]).not.toHaveProperty("tags");
  });

  it("passes the submitted document to the service as parsed JSON", async () => {
    service.update.mockResolvedValue({ ok: true, post: STORED });
    const document = { type: "doc", content: [{ type: "paragraph" }] };

    await savePostAction(
      "post-1",
      PREVIOUS,
      form({ ...VALID, content: JSON.stringify(document) }),
    );

    expect(service.update).toHaveBeenCalledWith(
      SESSION,
      "post-1",
      { ...VALID, content: document },
      NO_TOKEN,
    );
  });

  it("rejects content that is not JSON before the service is reached", async () => {
    const state = await savePostAction(
      "post-1",
      PREVIOUS,
      form({ ...VALID, content: "{not json" }),
    );

    expect(state).toMatchObject({
      values: VALID,
      fieldErrors: { content: expect.any(String) },
    });
    expect(service.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a content schema error from the service", async () => {
    service.update.mockResolvedValue({
      ok: false,
      reason: "invalid",
      fieldErrors: { content: "content.0.type: unknown node" },
    });

    const state = await savePostAction(
      "post-1",
      PREVIOUS,
      form({ ...VALID, content: '{"type":"doc","content":[{"type":"x"}]}' }),
    );

    expect(state.fieldErrors.content).toBe("content.0.type: unknown node");
    expect(state.saved).toBeUndefined();
  });
});

describe("publish intent", () => {
  it("saves, publishes that version, and reopens the post", async () => {
    service.update.mockResolvedValue({ ok: true, post: STORED });
    service.publish.mockResolvedValue({
      ok: true,
      post: { ...STORED, status: "PUBLISHED" },
    });

    await expect(
      savePostAction("post-1", PREVIOUS, form({ ...VALID, intent: "publish" })),
    ).rejects.toMatchObject({ path: "/admin/posts/post-1" });

    expect(service.publish).toHaveBeenCalledWith(SESSION, "post-1", {
      ifUpdatedAt: SAVED_AT,
    });
    expectPublicRevalidation();
  });

  it("does not publish when the save fails", async () => {
    service.update.mockResolvedValue({
      ok: false,
      reason: "invalid",
      fieldErrors: { title: "Title is required." },
    });

    await savePostAction(
      "post-1",
      PREVIOUS,
      form({ ...VALID, intent: "publish" }),
    );

    expect(service.publish).not.toHaveBeenCalled();
    expectNoPublicRevalidation();
  });

  it("keeps the saved token when publishing fails", async () => {
    service.update.mockResolvedValue({ ok: true, post: STORED });
    service.publish.mockResolvedValue({
      ok: false,
      reason: "invalid",
      fieldErrors: { content: "Not valid." },
    });

    const state = await savePostAction(
      "post-1",
      PREVIOUS,
      form({ ...VALID, intent: "publish" }),
    );

    expect(state).toMatchObject({
      fieldErrors: { content: "Not valid." },
      formError: expect.stringContaining("not published"),
      version: "2000",
    });
    expect(state.saved).toBeUndefined();
    expectNoPublicRevalidation();
  });

  it("is ignored for a post that does not exist yet", async () => {
    service.create.mockResolvedValue({ ok: true, post: STORED });

    await expect(
      savePostAction(null, PREVIOUS, form({ ...VALID, intent: "publish" })),
    ).rejects.toMatchObject({ path: "/admin/posts/post-1" });

    expect(service.publish).not.toHaveBeenCalled();
  });
});

describe("unpublish intent", () => {
  it("unpublishes without saving the form and reopens the post", async () => {
    service.unpublish.mockResolvedValue({ ok: true, post: STORED });

    await expect(
      savePostAction(
        "post-1",
        PREVIOUS,
        form({ title: "", slug: "", intent: "unpublish", version: "1000" }),
      ),
    ).rejects.toMatchObject({ path: "/admin/posts/post-1" });

    expect(service.unpublish).toHaveBeenCalledWith(SESSION, "post-1", {
      ifUpdatedAt: new Date(1_000),
    });
    expect(service.update).not.toHaveBeenCalled();
    expectPublicRevalidation();
  });

  it("reports a conflict and leaves public reads alone", async () => {
    service.unpublish.mockResolvedValue({ ok: false, reason: "conflict" });

    const state = await savePostAction(
      "post-1",
      PREVIOUS,
      form({ ...VALID, intent: "unpublish" }),
    );

    expect(state).toMatchObject({
      values: VALID,
      formError: expect.stringContaining("changed"),
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("autosavePostAction", () => {
  const DOCUMENT = { type: "doc", content: [{ type: "paragraph" }] };

  it("saves the parsed document under the token and returns the new one", async () => {
    service.autosave.mockResolvedValue({ ok: true, updatedAt: SAVED_AT });

    const response = await autosavePostAction(
      "post-1",
      "1000",
      JSON.stringify(DOCUMENT),
    );

    expect(service.autosave).toHaveBeenCalledWith(
      SESSION,
      "post-1",
      DOCUMENT,
      new Date(1_000),
    );
    expect(response).toEqual({ ok: true, version: "2000" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(["conflict", "not_found", "not_draft"] as const)(
    "passes on the %s outcome",
    async (reason) => {
      service.autosave.mockResolvedValue({ ok: false, reason });

      expect(await autosavePostAction("post-1", "1000", "{}")).toEqual({
        ok: false,
        reason,
      });
    },
  );

  it.each([
    ["a missing token", "post-1", "", "{}"],
    ["a malformed token", "post-1", "abc", "{}"],
    ["content that is not JSON", "post-1", "1000", "{not json"],
    ["a non-string post id", 7, "1000", "{}"],
    ["non-string content", "post-1", "1000", { type: "doc" }],
  ])("rejects %s before the service is reached", async (_name, ...args) => {
    const response = await autosavePostAction(
      ...(args as [string, string, string]),
    );

    expect(response).toEqual({ ok: false, reason: "invalid" });
    expect(service.autosave).not.toHaveBeenCalled();
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
    expectPublicRevalidation();
  });
});
