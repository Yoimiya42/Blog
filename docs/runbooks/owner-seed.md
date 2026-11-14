# Owner seed

Provisions the single owner account in D1. Sign-up is disabled, so the owner row must exist before the first login.

## Procedure

Apply migrations first, then seed. The command is safe to rerun.

```bash
npx wrangler d1 migrations apply DB --local
npm run seed:owner -- --email owner@example.com
```

Add `--remote` to target the remote database. The `DB` binding is production, `blog-production`; see ADR-0015. Arguments after a second `--` pass to `wrangler d1 execute`.

Without `--email`, the script reads `OWNER_EMAIL` from the process environment.

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

On 2026-11-10 the local database passed a first run, a rerun, and an owner change followed by a change back. On 2026-11-14 the owner ran the seed against `blog-production` with `--remote`. The verification query returned no rows before and one `OWNER` row after. `blog-preview` is not seeded.
