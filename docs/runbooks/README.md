# Operational runbooks

Use only procedures rehearsed against the live service named in each runbook.

| Procedure | Scope |
|---|---|
| [Cloudflare Workers preview and rollback](cloudflare-workers-preview.md) | Primary procedure for versioned Workers previews and code rollback |
| [Cloudflare Workers Builds](cloudflare-workers-builds.md) | GitHub-connected build pipeline configuration and log access |
| [Vercel Preview deployment](vercel-preview.md) | Pull request preview checks; not a production fallback since Issue #29 closed |

Add a stateful-service recovery runbook only after its restore procedure has been rehearsed against an isolated environment.
