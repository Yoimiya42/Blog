# Owner seed

Provisions the single owner account in D1. Sign-up is disabled, so the owner row must exist before the first login.

## Procedure

Apply migrations first, then seed. The command is safe to rerun.

Locally, `npm run setup:local` does both and reads the address from `OWNER_EMAIL` in `.env`; see `local-development.md`. The explicit form:

```bash
npx wrangler d1 migrations apply DB --local
node scripts/seed-owner.mjs --email owner@example.com
```

Call the script with `node`, not `npm run seed:owner -- ...`: PowerShell drops the bare `--`, so npm consumes `--email`.

Add `--remote` to target the remote database. The `DB` binding is production, `blog-production`; see ADR-0015. Arguments after a second `--` pass to `wrangler d1 execute`.

`--database <binding>` selects another binding. Seed `blog-preview` through the preview migrations config:

```bash
node scripts/seed-owner.mjs --email owner@example.com --remote --database PREVIEW_DB -- --config wrangler.preview-migrations.jsonc
```

Preview login also needs `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `OWNER_EMAIL`, and `BETTER_AUTH_SECRET` on the Preview base config:

```bash
npx wrangler preview base-config secret put OWNER_EMAIL
```

Use a `BETTER_AUTH_SECRET` that differs from production.

A Preview copies the base secrets once, when it is created. A Preview that already exists never receives later changes: delete it and push again, or set each secret on it with `npx wrangler preview secret put`. The login page shows the code step even when no secret is present, because Better Auth logs mail failures instead of returning them.

```bash
npx wrangler preview delete --name <branch>
```

Without `--email`, the script reads `OWNER_EMAIL` from the process environment. A local seed then falls back to `.env`; a `--remote` seed never does.

## Behaviour

- Rejects an invalid address before running SQL.
- Inserts the owner with a stable id derived from the address, or promotes the existing row with that address.
- Demotes any other `OWNER` row to `VISITOR`, so exactly one owner remains.
- Never deletes rows.

The address must match the Worker's `OWNER_EMAIL` secret. Login codes are sent only to that address.

## Verification

```bash
npx wrangler d1 execute DB --local --command "SELECT role, count(*) AS n FROM user GROUP BY role"
```

Expect one `OWNER` row.

## Evidence

On 2026-11-10 the local database passed a first run, a rerun, and an owner change followed by a change back. On 2026-11-14 the owner ran the seed against `blog-production` with `--remote`. The verification query returned no rows before and one `OWNER` row after.

On 2026-11-14 the owner seeded `blog-preview` with `--database PREVIEW_DB` and set the four secrets on the Preview base config. The verification query returned one `OWNER` row, and the secret list showed all four names.
