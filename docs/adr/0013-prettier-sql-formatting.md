# 0013. Format SQLite migrations with Prettier

- **Status**: Accepted
- **Date**: 2026-09-06
- **Requirements**: Issue #7

## Context

Handwritten migrations need deterministic formatting and early syntax feedback. Manual review did not catch full-width punctuation and an invalid trailing comma in a draft migration.

## Decision

Use the exact-pinned `prettier-plugin-sql-cst` development dependency with its SQLite parser. Existing Prettier scripts and staged-file checks cover every `.sql` file. Preserve identifier spelling and disable canonical syntax rewrites so formatting does not intentionally change SQL constructs.

The plugin runs only during development. It is absent from the Worker bundle and creates no browser or Worker network request, so mainland site reachability is unchanged. Wrangler remains the authority for D1 migration execution and SQLite behaviour.

## Trade-offs

- **Gain**: One formatter handles TypeScript and SQL while the SQL parser rejects malformed input.
- **Accept**: Formatter upgrades can change layout and require explicit diff review.
- **Reversal**: Low — remove the plugin and SQL-specific Prettier override.

## Rejected alternatives

- Manual formatting — it already allowed invalid punctuation into a migration draft.
- A standalone SQL formatter — it would duplicate the existing Prettier workflow.
