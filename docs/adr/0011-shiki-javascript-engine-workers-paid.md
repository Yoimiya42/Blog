# 0011. Shiki JavaScript engine and Workers Paid

- **Status**: Accepted
- **Date**: 2026-09-05
- **Requirements**: FR-BLOG-03, FR-BLOG-13, NFR-CN-05
- **Supersedes**: ADR-0009's "start on Workers Free" clause

## Context

Code highlighting runs on the server and must not ship a highlighter to visitors. Measurement of the two Shiki engines produced two blocking constraints. Workers rejects `WebAssembly.instantiate` on a buffer, which is how Shiki loads its inlined Oniguruma binary, so the WebAssembly engine cannot run. The JavaScript engine works but converts TextMate patterns on first use: 17 to 97 ms of CPU per language per isolate, against a 10 ms per-request limit on Workers Free. Subsequent highlights cost about 1 ms.

## Decision

Use `shiki/core` with `createJavaScriptRegexEngine`, bundling only the six languages in FR-BLOG-03 and one light theme. Hold the highlighter as a module-level singleton so per-language setup happens once per isolate.

Run production on Workers Paid. Its 30-second request budget absorbs first-use conversion without moving work into global scope.

Bundle size is not a constraint: the limit is 64 MiB uncompressed, and this configuration adds about 560 KiB.

## Trade-offs

- **Gain**: Highlighting stays server-side, so visitors download no highlighter and mainland latency is unaffected.
- **Accept**: A paid plan is required before production launch, and the engine choice is fixed by a platform restriction rather than preference.
- **Reversal**: Medium — precomputing highlight tokens at publish time would remove the runtime cost but needs a schema version and a regeneration path.

## Rejected alternatives

- Oniguruma WebAssembly engine — Workers forbids buffer instantiation.
- Warming every grammar in global scope on Workers Free — fits the 1-second startup budget but raises cold starts to roughly 330 ms and depends on unverified CPU accounting.
- Precomputing tokens in the admin browser — most robust, but expands schema v1 and the Issue #9 scope this close to release.
- A lighter highlighter such as Prism — lower fidelity, and reverses ADR-0010's rendering contract.
