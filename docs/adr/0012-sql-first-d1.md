# 0012. Start D1 with handwritten SQL

- **Status**: Accepted
- **Date**: 2026-09-06
- **Requirements**: FR-AUTH-05, FR-BLOG-01, FR-ADMIN-01
- **Supersedes**: The Drizzle decisions in ADR-0009 and ADR-0010

## Context

Issue #7 starts before any schema, migration, or production data exists. The maintainer needs direct ownership of SQLite schema design and query behaviour. An ORM would hide those mechanics. A mandatory later rewrite would create two schema sources without evidence that an ORM is needed.

## Decision

Write v1 schema changes as versioned SQLite SQL migrations. Apply them to D1 through Wrangler.

Repositories use typed D1 prepared statements with bound parameters. Only repository modules may access the D1 binding.

Use standard SQLite and preserve every migration. Future Drizzle adoption may map onto the existing database, but requires evidence and a separate Issue. Existing SQL migrations remain authoritative.

Better Auth may use a D1-compatible adapter, but it does not own application migration history.

## Trade-offs

Handwritten SQL exposes schema, constraints, indexes, and query costs. It requires explicit row types, value mapping, parameter binding, and stronger repository tests.

## Rejected alternatives

- Drizzle now: hides SQL before the schema is understood.
- Mandatory post-v1 rewrite: commits work before evidence shows a benefit.
