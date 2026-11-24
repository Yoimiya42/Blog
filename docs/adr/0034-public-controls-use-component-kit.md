# 0034. Public controls use the component kit

- **Status**: Accepted
- **Date**: 2026-11-24
- **Requirements**: FR-BLOG-01
- **Supersedes**: ADR-0026, the rule that public pages do not use the kit

## Context

The blog list view switch was a hand-written text toggle. The owner wants public controls to follow the admin kit: icons with tooltips and accessible names, little visible text.

## Decision

- Public interactive controls (buttons, toggles, tooltips) use components from `src/components/ui` and `lucide-react` icons.
- Public content layout and typography stay in `formal.css` and `blog.css`.
- A control must render on the server and work before scripts load; Radix adds tooltips and keyboard behaviour after hydration.
- No new package. Reachability is unchanged (ADR-0020).

## Trade-offs

- **Gain**: One control vocabulary across admin and public pages.
- **Accept**: Radix tooltip code on public pages that use a kit control.
- **Reversal**: Low — the affected controls are few and local.

## Rejected alternatives

- Hand-written public controls: duplicates focus, tooltip, and icon handling.
