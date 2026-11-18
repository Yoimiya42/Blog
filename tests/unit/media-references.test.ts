import { describe, expect, it } from "vitest";

import { findPostsReferencingMedia } from "@/features/post/server/media-references";

const image = (mediaId: string) => ({
  type: "image",
  attrs: { mediaId, alt: "" },
});

describe("findPostsReferencingMedia", () => {
  it("finds nested references in any stored shape", async () => {
    const posts = {
      listContentSources: async () => [
        {
          id: "p1",
          title: "Nested",
          content: {
            type: "doc",
            content: [{ type: "blockquote", content: [image("m1")] }],
          },
        },
        {
          id: "p2",
          title: "Other",
          content: { type: "doc", content: [image("m2")] },
        },
        // Malformed content must not throw or match.
        { id: "p3", title: "Broken", content: { type: "doc", content: "x" } },
        { id: "p4", title: "Null", content: null },
      ],
    };

    expect(await findPostsReferencingMedia(posts, "m1")).toEqual([
      { id: "p1", title: "Nested" },
    ]);
    expect(await findPostsReferencingMedia(posts, "m3")).toEqual([]);
  });
});
