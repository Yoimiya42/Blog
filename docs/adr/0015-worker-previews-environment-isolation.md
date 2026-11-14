# 0015. Worker Previews for preview and production isolation

- **Status**: Accepted
- **Date**: 2026-11-14
- **Requirements**: NFR-CN-04 to NFR-CN-06, architecture 3.6

## Context

ADR-0009 requires separate preview and production D1 databases. Until Issue #18, branch builds ran `wrangler versions upload`, which copies the top-level bindings and the Worker's secrets, so every preview shared the production database. The vinext build flattens the Wrangler configuration, so an environment must be selected at build time.

## Decision

Keep one Worker, `personal-site`. Top-level configuration is production and binds `blog-production`. The `previews` block binds `blog-preview`. Workers Builds runs `wrangler deploy` on `main` and `wrangler preview` on every other branch. Preview secrets live in the Previews base configuration; production secrets live on the Worker.

`wrangler.preview-migrations.jsonc` exposes the preview database to `wrangler d1 migrations`, which reads top-level bindings only.

Requires Wrangler 4.135.0 or later. The project pins `^4.162.0`.

## Trade-offs

- **Gain**: Isolation is version-controlled in one file. Previews inherit no production binding or secret.
- **Accept**: Worker Previews is in open beta. The preview database id appears in two files.
- **Reversal**: Low — move the `previews` block into `env.preview` and connect a second Worker.

## Rejected alternatives

- Wrangler environments with a second Worker — needs a second Workers Builds connection and a build-time `CLOUDFLARE_ENV` on every trigger.
- `wrangler versions upload` with a different binding — versions still share the Worker's production secrets.
