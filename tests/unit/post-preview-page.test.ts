import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOwner = vi.fn();
const getById = vi.fn();

class NotFoundSignal extends Error {}

vi.mock("@/features/auth", () => ({ requireOwner: () => requireOwner() }));
vi.mock("@/features/post/server/post.service", () => ({
  getPostService: async () => ({ getById }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFoundSignal();
  },
}));

import PreviewPostPage from "@/app/(admin)/admin/posts/[id]/preview/page";
import { ArticleContent, type ArticleDocument } from "@/features/post";

const SESSION = { user: { role: "OWNER" } };
const DOCUMENT: ArticleDocument = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Body." }] }],
};
const POST = {
  id: "post-1",
  title: "Hello",
  summary: null,
  content: DOCUMENT,
  contentSchemaVersion: 1,
};

/** Walks the returned tree without rendering async server components. */
function collect(node: ReactNode, found: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) {
    for (const child of node) collect(child as ReactNode, found);
  } else if (isValidElement(node)) {
    found.push(node);
    collect((node.props as { children?: ReactNode }).children, found);
  }

  return found;
}

function render() {
  return PreviewPostPage({ params: Promise.resolve({ id: "post-1" }) });
}

function alertsIn(tree: ReactNode) {
  return collect(tree).filter(
    (element) => (element.props as { role?: string }).role === "alert",
  );
}

beforeEach(() => {
  requireOwner.mockResolvedValue(SESSION);
});

describe("post preview page", () => {
  it("stops a non-owner before the post is read", async () => {
    requireOwner.mockRejectedValue(new NotFoundSignal());

    await expect(render()).rejects.toBeInstanceOf(NotFoundSignal);
    expect(getById).not.toHaveBeenCalled();
  });

  it("returns not found for a missing post", async () => {
    getById.mockResolvedValue(null);

    await expect(render()).rejects.toBeInstanceOf(NotFoundSignal);
    expect(getById).toHaveBeenCalledWith(SESSION, "post-1");
  });

  it("passes the stored document to the public renderer", async () => {
    getById.mockResolvedValue(POST);

    const tree = await render();
    const article = collect(tree).find(
      (element) => element.type === ArticleContent,
    );

    expect(article?.props).toEqual({ document: DOCUMENT, mediaById: {} });
    expect(alertsIn(tree)).toEqual([]);
  });

  it("refuses a document that fails schema validation", async () => {
    getById.mockResolvedValue({
      ...POST,
      content: { type: "doc", content: [{ type: "iframe" }] },
    });

    const tree = await render();

    expect(alertsIn(tree)).toHaveLength(1);
    expect(
      collect(tree).some((element) => element.type === ArticleContent),
    ).toBe(false);
  });

  it("refuses a document stored under another schema version", async () => {
    getById.mockResolvedValue({ ...POST, contentSchemaVersion: 2 });

    const tree = await render();

    expect(alertsIn(tree)).toHaveLength(1);
  });
});
