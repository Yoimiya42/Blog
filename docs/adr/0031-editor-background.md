# 0031. Editor background preference

- **Status**: Accepted
- **Date**: 2026-11-23
- **Requirements**: FR-ADMIN-26
- **Supersedes**: —

## Context

FR-ADMIN-26 puts a chosen library image behind the editor and turns the editor panels into frosted glass. The choice must render on first paint and follow the owner across devices. Glass over an arbitrary photo can break text contrast.

## Decision

- Migration `0008` adds `editor_background`: one row per user, a nullable `media_id`, and an `opacity` tier (`0`, `25`, `50`, `75`, `100`). The media module owns it; the editor receives the save action and upload contract as props (ADR-0024).
- The edit page renders the image server-side as a fixed layer at an allowed `/media` width. CSS `:has()` turns the admin canvas transparent and the marked panels to glass, so no client script runs before paint.
- Panel opacity rises with the tier so that a black image still leaves a panel background light enough for AA text. Secondary text darkens on glass.
- A deleted image stays referenced, no longer resolves, and the editor falls back to the plain canvas. The library flags the active background in its delete dialog.

## Trade-offs

- **Gain**: No flash of the plain canvas; one setting on every device; no new dependency.
- **Accept**: A production migration; glass is less transparent at high tiers.
- **Reversal**: Low — one table and scoped CSS.

## Rejected alternatives

- `localStorage` — per device, and the background appears only after hydration.
