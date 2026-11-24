# 0026. Admin component kit

- **Status**: Accepted; public-page exclusion superseded by 0034
- **Date**: 2026-11-22
- **Requirements**: —
- **Supersedes**: —

## Context

`architecture.md` limited shadcn/ui and Radix to admin primitives but named no packages, icon set, or usage rule. Hand-written Tailwind controls in the admin drifted in style and carried long text labels.

## Decision

- Admin UI is built from shadcn/ui components whose source lives in `src/components/ui`. A missing component is added there before a control is hand-written.
- Runtime packages: `radix-ui` (behaviour and accessibility), `cmdk` (searchable lists), `lucide-react` (the only icon set), `class-variance-authority`, `clsx`, `tailwind-merge` (class composition). Versions are pinned.
- Admin controls are icon-first: an icon with a tooltip and an accessible name replaces a visible text label where the meaning stays clear. Primary actions keep short text.
- shadcn tokens are defined in `globals.css` without its base layer. Public pages do not use this kit.
- All packages are bundled at build time; no runtime CDN. Mainland reachability is unaffected (ADR-0020).

## Trade-offs

- **Gain**: Consistent, accessible admin controls with less custom code.
- **Accept**: Six dependencies and copied component source to maintain.
- **Reversal**: Low — components are local source over replaceable primitives.

## Rejected alternatives

- Hand-written Tailwind controls: inconsistent and re-implements focus, keyboard, and popover behaviour.
