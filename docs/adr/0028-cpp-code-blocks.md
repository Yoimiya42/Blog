# 0028. C++ code blocks with the C grammar

- **Status**: Accepted
- **Date**: 2026-11-22
- **Requirements**: FR-BLOG-03
- **Supersedes**: —

## Context

The owner wants C++ code blocks. Shiki's `cpp` grammar is about 530 KB, more than the five bundled grammars combined (about 430 KB), and would add server CPU on first use (ADR-0011, ADR-0019) and editor download (ADR-0027). Article schema §5 requires a version bump and migration for node changes, but bumping `contentSchemaVersion` would lock every stored post out of the editor until a migration exists.

## Decision

- `cpp` is a new allowed `codeBlock.language` value in schema v1. It is additive: no stored value is reinterpreted, so no version bump or migration applies. Removing or renaming a value still follows §5.
- `cpp` highlights with the C grammar on the server and in the editor. No grammar is added.
- The label is "C++" and the icon is the C++ logo in the menu, editor header, and rendered article.

## Trade-offs

- **Gain**: C++ blocks with correct label and icon, at zero bundle, download, or CPU cost.
- **Accept**: C++-only syntax (`template`, `class`, `namespace`, `std::`) is coloured less fully than with a C++ grammar.
- **Reversal**: Low — map `cpp` to a C++ grammar later; stored documents are unchanged.

## Rejected alternatives

- Shiki `cpp` grammar — size and first-use CPU outweigh fuller colouring for occasional C++ posts.
- Schema v2 with migration — no stored data changes, so a migration would be ceremony only.
