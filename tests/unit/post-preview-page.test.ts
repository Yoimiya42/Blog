import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOwner = vi.fn();
const getById = vi.fn();
const getBySlug = vi.fn();

class NotFoundSignal extends Error {}

vi.mock("@/features/auth", () => ({ requireOwner: () => requireOwner() }));
vi.mock("@/features/post/server/post.service", () => ({
  getPostService: async () => ({ getById }),
}));
vi.mock("@/features/post/server/public-post.service", () => ({
  getPublicPostService: async () => ({ getBySlug }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFoundSignal();
  },
}));

import PostPreviewPage from "@/app/(site)/(blog)/preview/[id]/page";
import { PostArticle } from "@/features/post";

const SESSION = { user: { role: "OWNER" } };
const PUBLIC_POST = {
  slug: "hello",
  title: "Hello",
  summary: null,
  publishedAt: new Date("2026-11-01"),
  tags: [],
  readingMinutes: 1,
  document: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Body." }] },
    ],
  },
  isDraft: true,
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
  return PostPreviewPage({ params: Promise.resolve({ id: "post-1" }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireOwner.mockResolvedValue(SESSION);
  getById.mockResolvedValue({ id: "post-1", slug: "hello" });
  getBySlug.mockResolvedValue(PUBLIC_POST);
});

describe("post preview page", () => {
  it("stops a non-owner before the post is read", async () => {
    requireOwner.mockRejectedValue(new NotFoundSignal());

    await expect(render()).rejects.toBeInstanceOf(NotFoundSignal);
    expect(getById).not.toHaveBeenCalled();
    expect(getBySlug).not.toHaveBeenCalled();
  });

  it("returns not found for a missing post", async () => {
    getById.mockResolvedValue(null);

    await expect(render()).rejects.toBeInstanceOf(NotFoundSignal);
    expect(getById).toHaveBeenCalledWith(SESSION, "post-1");
  });

  it("renders the public article without its draft notice", async () => {
    const tree = await render();
    const article = collect(tree).find(
      (element) => element.type === PostArticle,
    );

    expect(getBySlug).toHaveBeenCalledWith("hello");
    expect(article?.props).toEqual({
      mediaById: {},
      post: PUBLIC_POST,
      showDraftNotice: false,
    });
  });

  it("links back to the editor", async () => {
    const tree = await render();
    const hrefs = collect(tree).map(
      (element) => (element.props as { href?: string }).href,
    );

    expect(hrefs).toContain("/admin/posts/post-1");
  });
});
