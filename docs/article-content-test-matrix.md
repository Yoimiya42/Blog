# Article Content Test Matrix

Issue: [#9](https://github.com/Yoimiya42/Blog/issues/9). Scope: Checkpoint 4, batch 1.
Contract: [schema v1](article-content-schema.md). Tests run with `npm run test`.

## Issue acceptance coverage

All paths below are relative to `tests/unit/`.

| Issue #9 criterion | Automated evidence |
|---|---|
| Approved v1 nodes, marks, attributes, and version | `article-content.test.ts` validates fixtures and version; `article-matrix.test.ts` compares schema discriminators, fixture coverage, and editor registration |
| Shared schema and separate registries | `article-editor.test.ts` checks attributes, defaults, content expressions, and normalization; `article-matrix.test.ts` checks runtime renderer keys; `content-boundary.test.ts` checks imports |
| Reject unknown content, attributes, unsafe links, image references, and languages | `article-content.test.ts` covers rejection cases and media resolution; `article-matrix.test.ts` injects unknown fields into every fixture node, mark, and attribute object |
| Render all approved content without the editor runtime | `article-renderer.test.ts` checks semantic HTML, order, escaping, links, media, and fallback output; `article-matrix.test.ts` renders every accepted fixture; `content-boundary.test.ts` checks source isolation |
| Stable heading anchors and table of contents | `article-editor-heading-id.test.ts` checks creation, edits, invalid IDs, and pasted duplicates; `article-derived.test.ts` checks H2–H4, merged marks, whitespace, and empty headings |
| Server Shiki highlighting for the approved languages | `article-highlighter.test.ts` checks all six modes; `article-highlighter-singleton.test.ts` checks concurrent initialization, reuse, loaded languages and aliases, and the fixed theme |
| Representative CJK, code, links, images, and invalid content | Shared fixtures plus the content, renderer, derived-data, and matrix suites |
| JSON remains authoritative; presentation is derived | `article-content-integration.test.ts` runs a real TipTap editor through JSON normalization, parsing, derivation, static HTML, and editor reload; stored JSON remains unchanged |

## Batch 1 behavior coverage

| Matrix | Evidence beyond the Issue criteria |
|---|---|
| Schema | H1/H5/H6, invalid IDs, all forbidden link protocols, whitespace/control characters, every code-mark combination, invalid ordered-list starts, restricted nesting, unknown inline nodes |
| Editor | Presentation attributes are removed; absent optional attributes are omitted; unknown node types still fail validation; real editor output reaches the public API |
| Derived data | One complete mixed article asserts exact TOC, text, and reading time; paragraph, hard-break, quote, list, code, caption, alt, and decorative-image behavior; Han, Hiragana, Katakana, Hangul, English, punctuation, minimum and ceiling boundaries |
| Public renderer | Public exports are pinned; registry keys track schema types; prose and metadata are escaped; unsupported blocks log only the type and show a generic fallback |
| Images | Shared media map, repeated IDs, resolved URL/dimensions, node-owned alt/caption, empty alt, whitespace captions, missing-media errors and accessible fallback; source boundary excludes database access |
| Code and copy | Empty/multiline and HTML-like code, React token elements, exact clipboard text, accessible success feedback, timer expiry, rejection/retry, overlapping clicks; source checks exclude raw HTML injection and client Shiki/TipTap imports |

## Acceptance boundary

Batch 1 requires `format:check`, `lint`, `typecheck`, `test`, `build`, and `git diff --check`.
The suite contains 202 passing tests across 12 files at this checkpoint.

Workers bundle comparison remains batch 2. Source import checks do not establish the deployed bundle size or contents. Public routes, D1 integration, editor UI, remote deployment, CPU, and cold-start measurements are outside this batch.
