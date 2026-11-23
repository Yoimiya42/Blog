# Local development

`npm run dev` is the only local server. It runs `vinext dev` on `http://localhost:3000` inside the Workers runtime, with the local D1 database, R2, and `.env` secrets.

Plain `next dev` cannot load `cloudflare:workers`, so every route that reads D1, auth, or mail fails with HTTP 500. The project has no script for it.

## First run

1. Create `.env` with `BETTER_AUTH_SECRET`, `OWNER_EMAIL`, `RESEND_API_KEY`, and `AUTH_EMAIL_FROM`.
2. Prepare the local database. The command applies pending migrations, then seeds the owner from `OWNER_EMAIL` in `.env`. It is safe to rerun.

   ```bash
   npm run setup:local
   ```

   Wrangler asks for confirmation when migrations are pending. Answer `y`.

3. Start the server:

   ```bash
   npm run dev
   ```

4. Sign in at `http://localhost:3000/login` with `OWNER_EMAIL`. The code arrives in the real mailbox through Resend.

Rerun `npm run setup:local` after pulling a new migration.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module 'cloudflare:workers'`, HTTP 500 | Server started with plain `next dev` | Stop it; run `npm run dev` |
| `/admin` returns 404 | No owner session; the guard hides the route | Sign in at `/login` |
| No code email arrives | Owner missing from local D1, or `OWNER_EMAIL` differs from the seeded address | `npm run setup:local` |
| `Another vinext dev server is already running` | vinext allows one server per checkout; an older one still runs, possibly on another port | Use the URL it prints, or stop that PID and rerun `npm run dev` |
| `no such table` | Local migrations pending | `npm run setup:local` |
| `npm run seed:owner -- --email x` reports an invalid address in PowerShell | PowerShell drops the bare `--`, so npm consumes `--email` | Call `node scripts/seed-owner.mjs --email x` |

## Evidence

On 2026-11-22 `npm run setup:local` reported no pending migrations and left one `OWNER` row. `npm run dev` then served `/blog`, a post with code blocks, and `/login` on `http://localhost:3000`.
