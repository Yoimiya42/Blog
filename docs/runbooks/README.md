# Operational runbooks

Use only procedures rehearsed against the live service named in each runbook.

| Procedure | Scope |
|---|---|
| [Local development](local-development.md) | Start the local Workers-runtime server, prepare the local database, and fix common startup failures |
| [Cloudflare Workers preview and rollback](cloudflare-workers-preview.md) | Primary procedure for versioned Workers previews and code rollback |
| [Cloudflare Workers Builds](cloudflare-workers-builds.md) | GitHub-connected build pipeline configuration and log access |
| [Production domain and DNS](production-domain.md) | DNS records, `www` redirect, HTTPS enforcement, and mail records for `fangmingluan.com` |
| [Production recovery](production-recovery.md) | Worker rollback and D1 Time Travel restore; rollback rehearsed on production, restore on `blog-preview` |
| [D1 migrations](d1-migrations.md) | Write, apply, verify, and undo D1 migrations; rehearsed locally and on `blog-preview`; applied on production |
| [Owner seed](owner-seed.md) | Provision the single owner account in D1; rehearsed locally, on `blog-preview`, and on production |
| [Media delivery](media-delivery.md) | R2 buckets, Access-protected source domains, `/media` transform route, and service-token rotation |

Add a stateful-service recovery runbook only after its restore procedure has been rehearsed against an isolated environment.
