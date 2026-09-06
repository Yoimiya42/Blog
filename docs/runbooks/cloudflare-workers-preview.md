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
- Remote startup time: 29 ms against the 1,000 ms Workers limit.
- Bindings: `ASSETS` and `CF_VERSION_METADATA` only.
- Baseline Version: `faa4fb30-b745-4c61-b3c3-a8699ae55bad`.
- Preview Version: `7fdf62be-25e1-4e8d-b5c0-f0367bb37980`.
- Fixed preview alias: `https://issue-29-personal-site.yoimiyacyy.workers.dev`.
- Browser checks: homepage, hard refresh, 404, console, static assets, and Vercel visual comparison passed.
- Rollback: the preview version served HTTP 200 at 100% traffic; the baseline was then restored to 100% and served HTTP 200.

The startup measurement used version `7efa30de-e498-422d-b23d-020424221dd7`. Representative request CPU is deferred to Issue #19 because this foundation Worker has no D1, authentication, article rendering, R2, or image workload. Production uses Workers Paid under [ADR-0011](../adr/0011-shiki-javascript-engine-workers-paid.md), which supersedes the earlier Free-plan condition.

The rehearsal did not include D1, authentication, R2, image processing, custom domains, or mainland China testing.

## Checkpoint 4: article bundle comparison

Measured locally on 2026-09-05 for Issue #9, after batch 1 commit `b5e426c`.
Node `22.14.0`, npm `11.11.0`, Wrangler `4.128.0`; dependencies came from each revision's lockfile through `npm ci`.

| Variant | Revision | Upload bytes | Upload KiB | gzip bytes | gzip KiB | Modules | `ssr/index.js` bytes |
|---|---|---:|---:|---:|---:|---:|---:|
| Latest `origin/main` | `e15e090` | 745,573 | 728.10 | 221,009 | 215.83 | 42 | 273,674 |
| Actual feature branch | `b5e426c` | 745,573 | 728.10 | 221,006 | 215.83 | 42 | 273,674 |
| Temporary dynamic article | `b5e426c` plus probe below | 1,411,182 | 1,378.11 | 346,173 | 338.06 | 45 | 273,820 |

Module counts include the entry module. Wrangler reports 41/41/44 *additional* modules. Static assets are separate: 18/18/19 files. All three vinext builds and Wrangler dry-runs passed, with only `ASSETS` and `CF_VERSION_METADATA` bindings.

The actual branch adds **0 bytes** and **0 modules** against the current baseline; gzip differs by **-3 bytes**. No application route imports the article module, and the actual Worker contains no article highlighter or editor runtime. Build identifiers affect hashes and compressed bytes, so earlier gzip figures of 215.91/215.87 KiB are historical measurements, not this comparison's baseline.

The dynamic article adds **665,609 bytes (650.0088 KiB)** and **125,167 gzip bytes (122.2334 KiB)** over the actual branch. It adds three upload modules; `ssr/index.js` grows by 146 bytes. This is the whole public-renderer route increment, including framework integration and shared-schema initialization, not an isolated Shiki package size. The 1,411,182-byte Worker is below the [64 MiB uncompressed limit](https://developers.cloudflare.com/workers/platform/limits/#worker-size) and follows ADR-0011's Paid-plan decision.

### Measurement method

1. Fetch `origin/main`; keep the feature branch selected.
2. Create detached temporary worktrees for `origin/main` and `b5e426c`.
3. Run `npm ci`, `npm run build:vinext`, and the command below for each variant. The actual branch is built in the primary checkout.

```powershell
npx wrangler deploy --dry-run --config dist/server/wrangler.json --outdir <temporary-output-directory>
```

4. In the feature worktree only, add `src/app/bundle-probe/page.tsx`: export `dynamic = "force-dynamic"`; import `ArticleContent` and the `ArticleDocument` type from `@/features/post`; return `ArticleContent({ document, mediaById: {} })` from an async page. Use heading `bundle-probe` and these six code blocks:

| Language | Raw code |
|---|---|
| plaintext | `plain output` |
| python | `print('hello')` |
| typescript | `const value: number = 1;` |
| java | `int value = 1;` |
| c | `int value = 1;` |
| go | `value := 1` |

5. Rebuild and repeat dry-run. vinext classifies `/bundle-probe` as `ƒ Dynamic`. A local `wrangler dev --local` request returned HTTP 200 with six code figures, six language labels, and six copy buttons. No route prerendered the article away.
6. Inspect upload files and capture `chunk.modules` in a temporary Vite `generateBundle` hook for the RSC, SSR, and client environments. A second instrumented build retained the exact article chunk SHA-256 and the same displayed upload/gzip sizes; framework build identifiers changed other hashes.
7. Sum uploaded JS module bytes, excluding Wrangler's output README. For exact gzip bytes, reproduce Wrangler's `getSize`: concatenate additional modules in its printed order, append the entry module, then run Node `gzipSync`. Do not sum separately compressed modules.
8. Stop the local Worker and remove both temporary worktrees. The probe and instrumentation do not enter the product commit.

### Module audit

The article RSC chunk is `_next/static/page-Cj87z0nJ.js`: **662,370 bytes**, SHA-256 `3381b408b7c8284ae43449bf694bedbfb2158501138a47954e1bca1cbee29cd8`.
Shiki and its regex dependencies account for 646,125 `renderedLength` units in the bundler module report. These pre-final-minification attribution values are not upload bytes and must not be added to the upload total.

| Included module | Bundler `renderedLength` |
|---|---:|
| `@shikijs/langs/dist/c.mjs` | 78,183 |
| `@shikijs/langs/dist/go.mjs` | 51,894 |
| `@shikijs/langs/dist/java.mjs` | 30,455 |
| `@shikijs/langs/dist/python.mjs` | 77,204 |
| `@shikijs/langs/dist/typescript.mjs` | 190,756 |
| `@shikijs/themes/dist/github-light.mjs` | 12,570 |
| Shiki core, types, primitive, TextMate, JavaScript engine, and regex helpers | 205,063 |

- Exactly five grammar modules and `github-light` are present. Plaintext uses text mode and adds no grammar. No other language or theme module appears.
- Shiki is confined to RSC. SSR and client graphs contain the copy button but no Shiki, TipTap, ProseMirror, or editor extension module.
- No `@tiptap/starter-kit`, editor registry, ProseMirror runtime, Oniguruma engine, or WASM module appears in the upload/module audit. `oniguruma-to-es` is the JavaScript regex converter required by the selected engine; it is not Oniguruma WASM.
- No data binding, secret, Cloudflare route, or domain was created or changed. All upload commands used `--dry-run`; the smoke request ran locally. No version upload or remote deployment occurred.

### CDN audit exception and remaining gates

The literal **no remote CDN URL in the bundle** check is not satisfied: both the baseline and representative `index.js` contain `https://fonts.googleapis.com/css2` in vinext's bundled `build/google-fonts/build-url.js` helper. No application source imports Google fonts, no additional CDN host was introduced by the article route, and the local probe HTML contains no Google Fonts URL. This baseline framework code is distinct from an active font request; this measurement does not prove mainland reachability. Do not report the literal scan as clean.

Batch 2 local gates passed: `format:check`, `lint`, `typecheck`, 202 tests across 12 files, Next.js `build`, vinext build, Wrangler dry-run, and `git diff --check`. The final primary-checkout rebuild reported 728.10 KiB / gzip 215.91 KiB with the same bindings; generated build identifiers explain the compressed-size variation from the comparison table. Batch 1 coverage is mapped in [the test matrix](../article-content-test-matrix.md).

Remote request CPU, cold starts, production traffic, and mainland testing remain outside this checkpoint. That build check now succeeds: PR #32 merged as `main` commit `57fa62b` on 2026-09-05, where the GitHub Actions `check` job, `Workers Builds: personal-site`, and Vercel all reported success. The CDN literal exception also requires explicit disposition before claiming every Checkpoint 4 safety check passed. Commit, push, PR status updates, and remote checks follow the repository's user-owned commit workflow.

## Official references

- [Preview URLs](https://developers.cloudflare.com/workers/configuration/previews/)
- [Versions and deployments](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/)
- [Rollbacks](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/)
- [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/)
