import { getSchema } from "@tiptap/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import * as publicApi from "@/features/post";
import { validArticleFixtures } from "@/features/post/content/fixtures";
import { articleEditorExtensions } from "@/features/post/content/editor/extensions";
import {
  nodeRenderers,
  markRenderers,
} from "@/features/post/content/render/registry";
import {
  blockNodeSchema,
  inlineNodeSchema,
  markSchema,
} from "@/features/post/content/schema";

type Tree = {
  type: string;
  content?: readonly Tree[];
  marks?: readonly Tree[];
  attrs?: Record<string, unknown>;
};
const nodes = new Set<string>();
const marks = new Set<string>();
const languages = new Set<unknown>();
function visit(node: Tree) {
  nodes.add(node.type);
  node.marks?.forEach((mark) => marks.add(mark.type));
  if (node.type === "codeBlock") languages.add(node.attrs?.language);
  node.content?.forEach(visit);
}
Object.values(validArticleFixtures).forEach(visit);
const blockNames = blockNodeSchema.options.map((node) => node.shape.type.value);
const inlineNames = inlineNodeSchema.options.map(
  (node) => node.shape.type.value,
);
const markNames = markSchema.options.map((mark) => mark.shape.type.value);
const sorted = (values: Iterable<unknown>) => [...values].sort();

describe("schema v1 matrix completeness", () => {
  it("rejects extra fields on every fixture node, mark, and attribute object", () => {
    let checked = 0;
    function checkTree(document: Tree, node: Tree) {
      const mutable = node as Tree & { unexpected?: string };
      mutable.unexpected = "must reject";
      expect(publicApi.validateArticleDocument(document).ok, node.type).toBe(
        false,
      );
      delete mutable.unexpected;
      checked += 1;
      if (node.attrs) {
        node.attrs.unexpected = "must reject";
        expect(
          publicApi.validateArticleDocument(document).ok,
          `${node.type}.attrs`,
        ).toBe(false);
        delete node.attrs.unexpected;
      }
      node.marks?.forEach((mark) => checkTree(document, mark));
      node.content?.forEach((child) => checkTree(document, child));
    }
    for (const fixture of Object.values(validArticleFixtures)) {
      const document = structuredClone(fixture);
      checkTree(document, document);
      expect(publicApi.validateArticleDocument(document).ok).toBe(true);
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("covers every persisted node, mark, and language with accepted fixtures", () => {
    expect(sorted(nodes)).toEqual(
      sorted(["doc", "listItem", ...blockNames, ...inlineNames]),
    );
    expect(sorted(marks)).toEqual(sorted(markNames));
    expect(sorted(languages)).toEqual(sorted(publicApi.CODE_LANGUAGES));
    const editor = getSchema(articleEditorExtensions);
    expect(sorted(Object.keys(editor.nodes))).toEqual(sorted(nodes));
    expect(sorted(Object.keys(editor.marks))).toEqual(sorted(marks));
  });

  it("registers every block and mark, with inline paths checked separately", () => {
    expect(sorted(Object.keys(nodeRenderers))).toEqual(
      sorted([...blockNames, "listItem"]),
    );
    expect(sorted(Object.keys(markRenderers))).toEqual(sorted(markNames));
    expect(sorted(inlineNames)).toEqual(["hardBreak", "text"]);
  });

  it("exposes only the public content API", () => {
    expect(Object.keys(publicApi).sort()).toEqual(
      [
        "ArticleContent",
        "CODE_LANGUAGES",
        "CONTENT_SCHEMA_VERSION",
        "collectMediaReferences",
        "deriveArticleContent",
        "parseArticleDocument",
        "validateArticleDocument",
        "validateMediaReferences",
      ].sort(),
    );
  });

  it.each(Object.entries(validArticleFixtures))(
    "renders accepted fixture %s through the public API",
    async (_name, input) => {
      const document = publicApi.parseArticleDocument(input);
      const mediaById = Object.fromEntries(
        publicApi
          .collectMediaReferences(document)
          .map((id) => [
            id,
            { url: `/media/${id}.webp`, width: 640, height: 480 },
          ]),
      );
      const html = renderToStaticMarkup(
        await publicApi.ArticleContent({ document, mediaById }),
      );
      expect(html).toContain('<article data-article-content="">');
      expect(html).not.toContain("Unsupported article content.");
      expect(html).not.toContain("Image unavailable.");
    },
  );
});
