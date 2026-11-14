# D1 migrations

Write, test, and apply SQLite migrations to D1. Rules: `architecture.md` section 3.6. Restore: `production-recovery.md`.

## Databases

| Environment | Database | Wrangler target |
|---|---|---|
| Test | In-memory, from `tests/wrangler.test.jsonc` | None; `npm run test` replays every migration |
| Local | `.wrangler/state` | `DB --local` |
| Preview | `blog-preview` | `PREVIEW_DB --config wrangler.preview-migrations.jsonc --remote` |
| Production | `blog-production` | `DB --remote` |

Workers Builds does not apply migrations. Apply them by hand, preview first.

## Write

1. Add `migrations/NNNN_short_title.sql` with the next number. Never edit an applied migration.
2. Format it with `npx prettier --write migrations`.
3. Cover new constraints in `tests/unit/migrations.test.ts` and run `npm run test`.

The test helper splits statements on `;`. A migration with a trigger, or a string literal containing `;` or `--`, must extend `tests/helpers/d1.ts` first.

## Apply

Commit the migration before applying it to a remote database. Apply in this order: local, preview, production.

```bash
npx wrangler d1 migrations apply DB --local
```

```bash
npx wrangler d1 migrations apply PREVIEW_DB --config wrangler.preview-migrations.jsonc --remote
```

Before production, record a Time Travel bookmark:

```bash
npx wrangler d1 time-travel info blog-production
```

```bash
npx wrangler d1 migrations apply DB --remote
```

Wrangler applies each file in one transaction and records it in `d1_migrations`. A failed file leaves the database unchanged.

Apply a migration before the code that needs it deploys. The migration must therefore be additive: the running Worker keeps working against the new schema. See expand–migrate–contract in `architecture.md` section 3.6.

## Verify

```bash
npx wrangler d1 migrations list DB --remote
```

Expect `No migrations to apply`. Replace the target for preview or local.

## Undo

There are no down migrations. Reverse a schema change with a new migration. Restore lost data with Time Travel to the recorded bookmark; the restore also removes the migration's `d1_migrations` row, so the file becomes pending again.

## Evidence

Rehearsed on 2026-11-14 for Issue #38.

Local: Wrangler applied migrations `0001` to `0006` to an empty database and reported none pending afterwards. `post`, `tag`, `post_tag`, and their three indexes existed.

`blog-preview`, apply: Wrangler applied `0006` in seven commands and reported none pending.

`blog-preview`, restore within one schema:

1. Recorded bookmark `00000006-00000002-00005123-257ad04f22aa282c5ee042eec3dd824f` with zero `tag` rows.
2. Inserted one marker row; `tag` held one row.
3. Restored to the bookmark; `tag` held zero rows and `d1_migrations` still held six.

`blog-preview`, restore across migration `0006`:

1. Restored to the pre-`0006` bookmark `00000004-00000000-00005123-52c76b4f381f70d80a08222336b8620e`. The three content tables were gone and `d1_migrations` held five rows.
2. Applied migrations again. Wrangler applied only `0006`; the three tables existed and `d1_migrations` held six rows.

`blog-production`, apply:

1. Recorded pre-`0006` bookmark `00000009-00000000-00005123-40819e055dbf42a2886b2b3617237420`. Restore to it to undo `0006`.
2. Wrangler applied `0006` in seven commands and reported none pending.
3. `post`, `tag`, `post_tag`, and their three indexes existed; `d1_migrations` held six rows; `user` still held the one owner row.
4. `https://fangmingluan.com/` and `/login` returned 200.

Not rehearsed: any restore on `blog-production`.
