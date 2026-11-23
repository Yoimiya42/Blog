# 0029. Design tokens

- **Status**: Accepted
- **Date**: 2026-11-22
- **Requirements**: —
- **Supersedes**: —

## Context

The formal shell and the admin defined unrelated variables, and about 80 admin class names used raw palette colours. Radii, durations, and title sizes were chosen per file. A restyle under #66 or dark mode in v2.5 would touch every component.

## Decision

- `globals.css` defines one token vocabulary in shadcn names: colours, radii (`mark`, `control`, `container`, `card`), durations, easings, and the type scale.
- Components use semantic utilities (`text-muted-foreground`, `rounded-control`) or `var(--token)`. Raw palette classes, hex colours, and literal durations outside token declarations fail a unit test.
- A shell may override token values on its root element; `.formal` keeps its current colours until #66 decides the direction. `architecture.md` already keeps token values per shell.
- Title sizes follow the scale: home name `4xl`, post title `3xl`, page titles `2xl`.

## Trade-offs

- **Gain**: A restyle or dark mode edits token values, not components.
- **Accept**: A test rule to maintain; brand logos stay hard-coded colours.
- **Reversal**: Low — tokens are plain CSS variables.
