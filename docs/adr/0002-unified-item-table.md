# 0002. One shared table for life-list categories

- **Status**: Accepted
- **Date**: 2026-08-29
- **Requirements**: FR-LIFE-*

## Context

Films, books, games, and places share most fields and workflows. New categories are expected, while category-specific data is mostly display-only.

## Decision

Store every category in one `Item` table with a `type` discriminator. Keep shared and queryable fields as typed columns. Store display-only category fields in `meta` JSON and validate each shape with zod. Drive category behaviour through `config/content-types.ts`.

Any field used for filtering, sorting, or aggregation must be a real column.

## Trade-offs

- **Gain**: One list, detail, form, and statistics pipeline supports every category.
- **Accept**: The application, not PostgreSQL, enforces category-specific JSON shapes.
- **Reversal**: Medium — a complex category can move to its own table through a migration.

## Rejected alternatives

- One table per category — duplicates fields, UI, queries, and migrations.
- Shared base table plus extension tables — adds joins and migrations without enough v1 value.
