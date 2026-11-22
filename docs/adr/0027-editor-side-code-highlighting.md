# 0027. Editor-side code highlighting with Shiki

- **Status**: Accepted
- **Date**: 2026-11-22
- **Requirements**: —
- **Supersedes**: —

## Context

ADR-0011 runs Shiki on the server only, so the TipTap editor showed code blocks as plain text. The owner rates editing experience first and requires editor colours to match the published article.

## Decision

- The editor highlights code blocks in the browser with the same Shiki core, JavaScript regex engine, grammars, and theme as the server.
- Theme and grammar loaders live in one shared module; server and editor cannot drift.
- Highlighting is a ProseMirror decoration plugin. It never changes the stored document.
- The editor loads no grammar up front. Each grammar is fetched the first time a block of that language appears; until then the block shows plain text.
- Scope is the admin editor chunk only. Public pages keep server-only Shiki.

## Trade-offs

- **Gain**: Highlighting while writing, identical to the published colours.
- **Accept**: The admin editor downloads Shiki core plus each used grammar (up to about 650 KB uncompressed for all six). Browser CPU only; Worker CPU is unaffected.
- **Reversal**: Low — remove one editor extension.

## Rejected alternatives

- lowlight (highlight.js): new dependencies and different tokenisation, so editor colours would not match the article.
