# Production recovery

Recover Worker `personal-site` and its D1 databases. Code and data recover separately: a Worker rollback never restores D1 data, and a D1 restore never changes code.

## Roll back the Worker

List deployments, then roll back to the last good version. The change reaches production within seconds.

```bash
npx wrangler deployments list --name personal-site
npx wrangler rollback <version-id> --name personal-site --message "<reason>" --yes
```

Confirm with the build id header, which changes with every build:

```bash
curl -s -D - -o /dev/null https://fangmingluan.com/ | grep -i x-vinext-build-id
```

Return to a newer version with `versions deploy`:

```bash
npx wrangler versions deploy <version-id>@100% --name personal-site --message "<reason>" --yes
```

A version carries its own bindings. Rolling back across a binding change also switches the database. Versions older than `af5080c7` bind `personal-site-development`; do not roll back past it once that database is deleted.

## Restore a D1 database

Time Travel restores a database to any point in the last 30 days. Record a bookmark before a risky change.

```bash
npx wrangler d1 time-travel info blog-production
npx wrangler d1 time-travel restore blog-production --bookmark <bookmark>
```

Use `--timestamp <unix-or-rfc3339>` when no bookmark was recorded. The restore output prints `previous_bookmark`; restore to it to undo the restore.

For `blog-preview`, replace the name with `PREVIEW_DB --config wrangler.preview-migrations.jsonc`.

A restore discards every write after the bookmark, including sessions and login codes. Rehearse on `blog-preview` before restoring production.

## Secret changes deploy a version

Adding or changing a secret, in the dashboard or with `wrangler secret put`, creates a new version from the latest uploaded version and deploys it at once. It does not fork the active deployment. Check `wrangler deployments list` after every secret change.

On 2026-11-14 the four production secrets were added while the active deployment was the homepage build `fca8a3e`. The resulting versions served `/login`, which `fca8a3e` does not contain: they were built from a later branch upload made by `wrangler versions upload`. Branch builds now run `wrangler preview` and no longer upload Worker versions, so this path is closed; see ADR-0015.

## Evidence

Rehearsed on 2026-11-14 for Issue #18.

Worker rollback, on production:

| Time (UTC) | Action | Build id | `/login` |
|---|---|---|---|
| 10:43:05 | Baseline, version `af5080c7` | `681f2405…` | 200 |
| 10:43:15 | After `wrangler rollback fe773ac3` | `a77c337e…` | 200 |
| 10:43:34 | After `wrangler versions deploy af5080c7@100%` | `681f2405…` | 200 |

Each switch was visible on the first request after the command returned. No request failed.

D1 Time Travel, on `blog-preview`:

1. Recorded bookmark `00000004-00000000-00005123-52c76b4f381f70d80a08222336b8620e` with zero `user` rows.
2. Inserted one marker row; `user` held one row.
3. Restored to the bookmark; `user` held zero rows and `d1_migrations` still held five.

Not rehearsed: a Time Travel restore on `blog-production`, and a rollback across a schema migration.
