import type { ArticleDocument } from "./types";

/**
 * Shared documents for tests, seeds, and editor work. Kept in src so later
 * issues reuse one set of samples instead of inventing their own.
 */
export const validArticleFixtures = {
  emptyDraft: {
    type: "doc",
    content: [{ type: "paragraph" }],
  },

  cjkProse: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "这是一段中文正文，用于验证排版与校验。" },
        ],
      },
    ],
  },

  headings: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2, id: "intro" },
        content: [{ type: "text", text: "前言" }],
      },
      {
        type: "heading",
        attrs: { level: 3, id: "detail" },
        content: [{ type: "text", text: "细节" }],
      },
      {
        type: "heading",
        attrs: { level: 4, id: "edge-case" },
        content: [{ type: "text", text: "边界情况" }],
      },
    ],
  },

  marks: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "bold", marks: [{ type: "bold" }] },
          { type: "text", text: "italic", marks: [{ type: "italic" }] },
          { type: "text", text: "strike", marks: [{ type: "strike" }] },
          { type: "text", text: "code", marks: [{ type: "code" }] },
          {
            type: "text",
            text: "both",
            marks: [{ type: "bold" }, { type: "italic" }],
          },
        ],
      },
    ],
  },

  links: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "relative",
            marks: [{ type: "link", attrs: { href: "/blog/hello" } }],
          },
          {
            type: "text",
            text: "anchor",
            marks: [{ type: "link", attrs: { href: "#intro" } }],
          },
          {
            type: "text",
            text: "https",
            marks: [{ type: "link", attrs: { href: "https://example.com" } }],
          },
          {
            type: "text",
            text: "http",
            marks: [{ type: "link", attrs: { href: "http://example.com" } }],
          },
          {
            type: "text",
            text: "mailto",
            marks: [{ type: "link", attrs: { href: "mailto:me@example.com" } }],
          },
        ],
      },
    ],
  },

  hardBreak: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "first line" },
          { type: "hardBreak" },
          { type: "text", text: "second line" },
        ],
      },
    ],
  },

  blockquote: {
    type: "doc",
    content: [
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "quoted line" }],
          },
        ],
      },
    ],
  },

  nestedLists: {
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "one" }] },
            ],
          },
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "two" }] },
              {
                type: "bulletList",
                content: [
                  {
                    type: "listItem",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "nested" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  orderedListWithStart: {
    type: "doc",
    content: [
      {
        type: "orderedList",
        attrs: { start: 3 },
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "third" }] },
            ],
          },
        ],
      },
    ],
  },

  horizontalRule: {
    type: "doc",
    content: [{ type: "paragraph" }, { type: "horizontalRule" }],
  },

  image: {
    type: "doc",
    content: [
      {
        type: "image",
        attrs: { mediaId: "med_01", alt: "a grey cat", caption: "My cat" },
      },
    ],
  },

  decorativeImage: {
    type: "doc",
    content: [{ type: "image", attrs: { mediaId: "med_02", alt: "" } }],
  },

  codeBlocks: {
    type: "doc",
    content: [
      {
        type: "codeBlock",
        attrs: { language: "plaintext" },
        content: [{ type: "text", text: "plain output" }],
      },
      {
        type: "codeBlock",
        attrs: { language: "python" },
        content: [{ type: "text", text: "print('hi')" }],
      },
      {
        type: "codeBlock",
        attrs: { language: "typescript" },
        content: [{ type: "text", text: "const a = 1;" }],
      },
      {
        type: "codeBlock",
        attrs: { language: "java" },
        content: [{ type: "text", text: "int a = 1;" }],
      },
      {
        type: "codeBlock",
        attrs: { language: "c" },
        content: [{ type: "text", text: "int a = 1;" }],
      },
      {
        type: "codeBlock",
        attrs: { language: "go" },
        content: [{ type: "text", text: "a := 1" }],
      },
    ],
  },

  emptyCodeBlock: {
    type: "doc",
    content: [{ type: "codeBlock", attrs: { language: "go" } }],
  },
} satisfies Record<string, ArticleDocument>;

type InvalidFixture = { document: unknown; reason: string };

/** Every entry must be rejected. `reason` documents which rule catches it. */
export const invalidArticleFixtures = {
  emptyDocument: {
    document: { type: "doc", content: [] },
    reason: "a document needs at least one block",
  },
  missingContent: {
    document: { type: "doc" },
    reason: "content is required",
  },
  unknownRootType: {
    document: { type: "article", content: [{ type: "paragraph" }] },
    reason: "the root node must be doc",
  },
  headingLevelOne: {
    document: {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 1, id: "a1" } }],
    },
    reason: "level one is reserved for the post title",
  },
  headingLevelFive: {
    document: {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 5, id: "a1" } }],
    },
    reason: "only levels two to four are allowed",
  },
  headingIdWithSlash: {
    document: {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2, id: "a/b" } }],
    },
    reason: "heading ids must stay URL-fragment safe",
  },
  duplicateHeadingId: {
    document: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2, id: "same" } },
        { type: "heading", attrs: { level: 3, id: "same" } },
      ],
    },
    reason: "heading ids must be unique within a document",
  },
  unknownNode: {
    document: {
      type: "doc",
      content: [{ type: "video", attrs: { src: "clip.mp4" } }],
    },
    reason: "unknown node names are rejected",
  },
  unknownMark: {
    document: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "x", marks: [{ type: "underline" }] },
          ],
        },
      ],
    },
    reason: "unknown mark names are rejected",
  },
  unknownAttribute: {
    document: {
      type: "doc",
      content: [{ type: "paragraph", align: "center" }],
    },
    reason: "unknown attributes are rejected, not stripped",
  },
  codeMarkCombined: {
    document: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "code" }, { type: "bold" }],
            },
          ],
        },
      ],
    },
    reason: "code cannot combine with other marks",
  },
  javascriptLink: {
    document: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    },
    reason: "the javascript protocol is not on the allowlist",
  },
  dataLink: {
    document: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [
                { type: "link", attrs: { href: "data:text/html,<b>x</b>" } },
              ],
            },
          ],
        },
      ],
    },
    reason: "the data protocol is not on the allowlist",
  },
  protocolRelativeLink: {
    document: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "link", attrs: { href: "//example.com" } }],
            },
          ],
        },
      ],
    },
    reason: "protocol-relative URLs leave the site silently",
  },
  untrimmedLink: {
    document: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [
                { type: "link", attrs: { href: "  javascript:alert(1)" } },
              ],
            },
          ],
        },
      ],
    },
    reason: "leading whitespace is a protocol-check bypass",
  },
  malformedLink: {
    document: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "link", attrs: { href: "not a url" } }],
            },
          ],
        },
      ],
    },
    reason: "unparsable URLs are rejected",
  },
  imageWithoutMediaId: {
    document: {
      type: "doc",
      content: [{ type: "image", attrs: { alt: "a cat" } }],
    },
    reason: "mediaId is required",
  },
  imageWithUrlAttribute: {
    document: {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { mediaId: "med_01", alt: "x", url: "https://cdn/x.png" },
        },
      ],
    },
    reason: "URLs are resolved through Media, never stored in the document",
  },
  unknownCodeLanguage: {
    document: {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "rust" },
          content: [{ type: "text", text: "x" }],
        },
      ],
    },
    reason: "only bundled Shiki grammars are allowed",
  },
  codeBlockWithMarks: {
    document: {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "go" },
          content: [{ type: "text", text: "x", marks: [{ type: "bold" }] }],
        },
      ],
    },
    reason: "code block text carries no marks",
  },
  listItemAtTopLevel: {
    document: {
      type: "doc",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [] }],
        },
      ],
    },
    reason: "list items only exist inside a list",
  },
  emptyListItem: {
    document: {
      type: "doc",
      content: [
        { type: "bulletList", content: [{ type: "listItem", content: [] }] },
      ],
    },
    reason: "a list item starts with a paragraph",
  },
  hardBreakAtTopLevel: {
    document: { type: "doc", content: [{ type: "hardBreak" }] },
    reason: "hard breaks are inline, not blocks",
  },
  orderedListStartZero: {
    document: {
      type: "doc",
      content: [
        {
          type: "orderedList",
          attrs: { start: 0 },
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "x" }] },
              ],
            },
          ],
        },
      ],
    },
    reason: "start must be a positive integer",
  },
} satisfies Record<string, InvalidFixture>;
