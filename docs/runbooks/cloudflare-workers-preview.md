# Cloudflare Workers preview and rollback

Build a committed feature branch, upload a version-addressable Workers preview, and prove that the active deployment can be restored. Use `dist/server/wrangler.json` for remote commands because vinext generates that deployment config from the repository configuration.

This procedure does not release the project production site or validate mainland China reachability. The `*.workers.dev` hosts are platform evidence only.

## Safety boundary

- Run from a non-`main` branch with a clean, committed worktree.
- Authenticate with the intended Cloudflare account through `npx wrangler whoami`.
- Keep D1, R2, KV, secrets, routes, and custom domains out of this foundation preview.
- Treat preview URLs as public until a separate access-control decision is implemented.
- Never bind a preview version to production data.

`wrangler.jsonc` is the source configuration. `npm run build:vinext` regenerates the ignored `dist/server/wrangler.json`. Never edit the generated file directly.

## Build and inspect

```shell
git status --short --branch
npx wrangler whoami
npm run check
npm run build:vinext
npx wrangler deploy --dry-run --config dist/server/wrangler.json
git diff --check
```

Inspect the dry-run output. Confirm the compressed Worker size fits the selected plan and that the binding list contains only the intended resources.

## Bootstrap a new Worker once

`wrangler versions upload` cannot create a Worker that does not exist. Error `10007` from `wrangler versions list` identifies this state. Establish one active baseline only when the service is new:

```shell
npx wrangler deploy --config dist/server/wrangler.json --tag <baseline-tag> --message "<baseline-message>"
```

Do not attach a custom domain, route, data binding, or secret during this bootstrap. Record the returned baseline Version ID. This one-time Active Deployment exists only on `workers.dev` and is not the project production release.

## Upload a preview version

Use a lowercase alias. Uploading a version must not change the Active Deployment.

```shell
npx wrangler versions upload --config dist/server/wrangler.json --preview-alias <lowercase-alias> --tag <preview-tag> --message "<preview-message>"
npx wrangler versions list --config dist/server/wrangler.json
npx wrangler deployments status --config dist/server/wrangler.json
```

Open the fixed alias URL. Verify the homepage, hard refresh, application 404 page, browser console, and static asset requests. Confirm that the Active Deployment still points to the baseline Version ID.

## Rehearse promotion and rollback

Run this rehearsal only while the Worker has no production domain, route, data binding, or secret.

```shell
npx wrangler versions deploy <preview-version-id>@100% --config dist/server/wrangler.json --message "<promotion-message>" --yes
npx wrangler deployments status --config dist/server/wrangler.json
curl.exe -I https://<worker-subdomain>.workers.dev

npx wrangler rollback <baseline-version-id> --config dist/server/wrangler.json --message "<rollback-message>" --yes
npx wrangler deployments status --config dist/server/wrangler.json
curl.exe -I https://<worker-subdomain>.workers.dev
```

The first status must show the preview version at 100%. The final status must show the baseline version at 100%. Both requests must return HTTP 200.

A Worker rollback restores the selected Worker version. It does not restore D1, R2, KV, Durable Object, or other bound resource data. Each stateful service requires its own tested recovery procedure before production.

## Rehearsal evidence

Issue #29 rehearsed this procedure on 2026-09-03 from commit `62d7131`.

- Compatibility: five supported checks, zero partial checks; vinext added the required ESM package setting.
- Dry-run size: 728.10 KiB total and 215.91 KiB compressed.
- Bindings: `ASSETS` and `CF_VERSION_METADATA` only.
- Baseline Version: `faa4fb30-b745-4c61-b3c3-a8699ae55bad`.
- Preview Version: `7fdf62be-25e1-4e8d-b5c0-f0367bb37980`.
- Fixed preview alias: `https://issue-29-personal-site.yoimiyacyy.workers.dev`.
- Browser checks: homepage, hard refresh, 404, console, static assets, and Vercel visual comparison passed.
- Rollback: the preview version served HTTP 200 at 100% traffic; the baseline was then restored to 100% and served HTTP 200.

The rehearsal did not include D1, authentication, R2, image processing, custom domains, or mainland China testing.

## Official references

- [Preview URLs](https://developers.cloudflare.com/workers/configuration/previews/)
- [Versions and deployments](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/)
- [Rollbacks](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/)
- [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/)
