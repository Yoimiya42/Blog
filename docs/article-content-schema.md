# Article Content Schema

> Schema v1 · 2026-09-05
> Decision: ADR-0010. Requirement: FR-BLOG-13.

## 1. Invariants

- `Post.content` stores one TipTap JSON document in D1 `TEXT` through Drizzle JSON mode. It is the only authoritative article body.
- `Post.contentSchemaVersion` identifies the project schema. Version 1 is the launch schema.
- The server validates every write. Drizzle typing does not replace runtime validation.
- Shape validation is synchronous and database-free. Confirming that every `mediaId` resolves is a separate step, run only by callers that persist a document.
- Unknown nodes, marks, attributes, and unsafe URLs are rejected.
- Nodes store content data only. They never store HTML, JavaScript, React component names, or third-party embed code.
- HTML, Markdown, plain text, table-of-contents data, reading time, and highlighted code are derived outputs.
- Public rendering does not load the TipTap editor runtime or any external TipTap asset.

## 2. Version 1 document

The root is a `doc` node with one or more block nodes. A blank draft contains one empty paragraph. The post title remains structured metadata and is not repeated as a level-one heading.

| Kind | Name | Content or attributes |
|---|---|---|
| Node | `doc` | Block nodes |
| Node | `paragraph` | Inline content |
| Node | `heading` | Inline content; `level` is 2, 3, or 4; `id` is unique and stable within the document |
| Node | `blockquote` | Paragraphs, lists, code blocks, and rules; no headings, images, or nested quotes |
| Node | `bulletList` | `listItem` nodes |
| Node | `orderedList` | `listItem` nodes; optional positive `start` |
| Node | `listItem` | An opening paragraph, then paragraphs, lists, and code blocks; no headings or images |
| Node | `horizontalRule` | No content or attributes |
| Node | `hardBreak` | No content or attributes |
| Node | `text` | UTF-8 text |
| Node | `image` | Atomic block; required `mediaId` and `alt`; optional `caption` |
| Node | `codeBlock` | Text only; `language` is `plaintext`, `python`, `typescript`, `java`, `c`, or `go` |
| Mark | `bold` | No attributes |
| Mark | `italic` | No attributes |
| Mark | `strike` | No attributes |
| Mark | `code` | No attributes; cannot combine with other marks |
| Mark | `link` | Required `href`; allow relative, `https`, `http`, and `mailto` URLs only |

Heading IDs are generated when a heading is created and remain unchanged when its text changes. Duplicate IDs are invalid. Image nodes resolve dimensions and URLs through `Media`; stored article JSON does not duplicate them.

## 3. Runtime boundaries

Use TipTap StarterKit with only the v1 nodes and marks enabled. Override the bundled `blockquote` and `listItem` content expressions: StarterKit accepts any block in both, which lets the editor build content the server rejects. Disable level-one, level-five, and level-six headings and underline. Register project-owned `image` and heading-ID extensions; do not register the URL-based image extension. Drop cursor, gap cursor, undo/redo, list keymap, and trailing-node behaviour are editor-only and are not persisted.

The shared schema contains no React or TipTap runtime imports. A client-only editor registry and server-safe React renderer registry use the same node names. Public code cannot import the editor registry.

## 4. Rendering contract

| TipTap node | Public renderer |
|---|---|
| `paragraph` | `Paragraph` |
| `heading` | `ArticleHeading` |
| `blockquote` | `Blockquote` |
| `bulletList`, `orderedList`, `listItem` | Semantic list elements |
| `horizontalRule` | `ArticleDivider` |
| `image` | `ArticleImage` |
| `codeBlock` | `CodeBlock` with server-side Shiki output and a copy action |

Marks map to semantic React elements. Links receive protocol validation and safe external-link attributes. An unsupported node produces a visible non-sensitive fallback and an error log; it never executes stored data.

## 5. Evolution

Adding or changing a persisted node requires:

1. A versioned PRD requirement.
2. An incremented `contentSchemaVersion`.
3. A deterministic migration from the previous version.
4. Validator, editor, renderer, and export updates.
5. Migration and round-trip fixtures.

Migrations operate on JSON trees and preserve the previous version until all stored articles pass verification. Never silently reinterpret an existing node name or attribute.

Deferred nodes include `photoGallery`, `map`, `musicEmbed`, `callout`, `timeline`, `math`, interactive components, and custom layouts. Markdown and HTML import are also deferred. None belong to schema v1.
