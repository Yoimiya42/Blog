import { z } from "zod";

import { CODE_LANGUAGES, type ArticleDocument } from "./types";

const SAFE_LINK_PROTOCOLS = ["http:", "https:", "mailto:"];

/** Heading ids become URL fragments, so keep them fragment-safe. */
const HEADING_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Article links are rendered into public pages, so protocols are an allowlist:
 * anything not proven safe is rejected. A blocklist of javascript: and data:
 * would miss encoded and future variants.
 */
export function isSafeHref(href: string): boolean {
  // Site-relative hrefs below skip URL parsing, so they are never normalised.
  // These two guards keep unnormalised input out of that shortcut; absolute
  // URLs do not need them because new URL() normalises before the protocol
  // check.
  if (href !== href.trim()) return false;
  if (hasControlCharacter(href)) return false;
  // Protocol-relative URLs inherit the page protocol and point off-site.
  if (href.startsWith("//")) return false;
  // In-document anchors and site-relative paths carry no protocol.
  if (href.startsWith("/") || href.startsWith("#")) return true;
  try {
    return SAFE_LINK_PROTOCOLS.includes(new URL(href).protocol);
  } catch {
    return false;
  }
}

export const boldMarkSchema = z.strictObject({ type: z.literal("bold") });
export const italicMarkSchema = z.strictObject({ type: z.literal("italic") });
export const strikeMarkSchema = z.strictObject({ type: z.literal("strike") });
export const codeMarkSchema = z.strictObject({ type: z.literal("code") });

export const linkMarkSchema = z.strictObject({
  type: z.literal("link"),
  attrs: z.strictObject({
    href: z.string().refine(isSafeHref, { error: "unsupported link target" }),
  }),
});

export const markSchema = z.discriminatedUnion("type", [
  boldMarkSchema,
  italicMarkSchema,
  strikeMarkSchema,
  codeMarkSchema,
  linkMarkSchema,
]);

export const textNodeSchema = z.strictObject({
  type: z.literal("text"),
  text: z.string(),
  marks: z
    .array(markSchema)
    .refine(
      (marks) =>
        !marks.some((mark) => mark.type === "code") || marks.length === 1,
      { error: "code cannot combine with other marks" },
    )
    .optional(),
});

export const hardBreakNodeSchema = z.strictObject({
  type: z.literal("hardBreak"),
});

export const inlineNodeSchema = z.discriminatedUnion("type", [
  textNodeSchema,
  hardBreakNodeSchema,
]);

export const paragraphNodeSchema = z.strictObject({
  type: z.literal("paragraph"),
  content: z.array(inlineNodeSchema).optional(),
});

export const headingNodeSchema = z.strictObject({
  type: z.literal("heading"),
  attrs: z.strictObject({
    level: z.literal([2, 3, 4]),
    id: z.string().regex(HEADING_ID_PATTERN, { error: "invalid heading id" }),
  }),
  content: z.array(inlineNodeSchema).optional(),
});

export const blockquoteNodeSchema = z.strictObject({
  type: z.literal("blockquote"),
  content: z.tuple([paragraphNodeSchema], paragraphNodeSchema),
});

export const listItemNodeSchema = z.strictObject({
  type: z.literal("listItem"),
  // Getter defers evaluation so listItem and the list nodes can reference
  // each other; nested lists are only reachable through this cycle.
  get content() {
    return z.tuple([paragraphNodeSchema], listBlockNodeSchema);
  },
});

export const bulletListNodeSchema = z.strictObject({
  type: z.literal("bulletList"),
  content: z.tuple([listItemNodeSchema], listItemNodeSchema),
});

export const orderedListNodeSchema = z.strictObject({
  type: z.literal("orderedList"),
  attrs: z.strictObject({ start: z.number().int().positive() }).optional(),
  content: z.tuple([listItemNodeSchema], listItemNodeSchema),
});

export const listBlockNodeSchema = z.discriminatedUnion("type", [
  bulletListNodeSchema,
  orderedListNodeSchema,
]);

export const horizontalRuleNodeSchema = z.strictObject({
  type: z.literal("horizontalRule"),
});

export const imageNodeSchema = z.strictObject({
  type: z.literal("image"),
  attrs: z.strictObject({
    mediaId: z.string().min(1),
    // An empty alt is the correct marker for a decorative image.
    alt: z.string(),
    caption: z.string().optional(),
  }),
});

/** Code block text carries no marks, so it cannot reuse textNodeSchema. */
export const plainTextNodeSchema = z.strictObject({
  type: z.literal("text"),
  text: z.string(),
});

export const codeBlockNodeSchema = z.strictObject({
  type: z.literal("codeBlock"),
  attrs: z.strictObject({ language: z.literal(CODE_LANGUAGES) }),
  content: z.array(plainTextNodeSchema).optional(),
});

export const blockNodeSchema = z.discriminatedUnion("type", [
  paragraphNodeSchema,
  headingNodeSchema,
  blockquoteNodeSchema,
  bulletListNodeSchema,
  orderedListNodeSchema,
  horizontalRuleNodeSchema,
  imageNodeSchema,
  codeBlockNodeSchema,
]);

export const articleDocumentSchema = z.strictObject({
  type: z.literal("doc"),
  // nonempty() only constrains runtime; tuple-with-rest also matches types.ts.
  content: z.tuple([blockNodeSchema], blockNodeSchema),
});

type AssertEqual<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;
type Expect<T extends true> = T;

/**
 * types.ts is the authoritative shape and this schema is written separately, so
 * the two can silently drift. This assertion turns any drift into a build error.
 */
export type SchemaMatchesTypes = Expect<
  AssertEqual<z.infer<typeof articleDocumentSchema>, ArticleDocument>
>;
