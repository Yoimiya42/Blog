# Operational runbooks

Use only procedures rehearsed against the live service named in each runbook.

| Procedure | Scope |
|---|---|
| [Cloudflare Workers preview and rollback](cloudflare-workers-preview.md) | Primary procedure for versioned Workers previews and code rollback |
| [Vercel Preview deployment](vercel-preview.md) | Temporary platform fallback until Issue #29 closes |

Add a stateful-service recovery runbook only after its restore procedure has been rehearsed against an isolated environment.
