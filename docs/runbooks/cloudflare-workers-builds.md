# Cloudflare Workers Builds

Configure and diagnose the GitHub-connected build pipeline for Worker `personal-site`. Dashboard path: **Workers & Pages > personal-site > Settings > Build**.

Wrangler cannot read build logs. Use the Builds API described below.

## Configuration

| Setting | Value |
|---|---|
| Build command | `npm run build:vinext` |
| Deploy command | `npx wrangler deploy --config dist/server/wrangler.json` |
| Version command | `npx wrangler versions upload --config dist/server/wrangler.json` |
| Root directory | `/` |
| Production branch | `main` |
| Builds for non-production branches | Enabled |

Two triggers exist. The production trigger matches `main` and runs the deploy command. The non-production trigger matches every other branch and runs the version command, which uploads a preview version without changing the Active Deployment.

`npm run build` runs `next build` and writes `.next/`. It never produces `dist/server/wrangler.json`. Only `npm run build:vinext` does, and every deploy command in this project reads that generated file. The build command and the deploy command must both belong to the vinext path.

## Node version

`.node-version` pins 22.23.2. The build image defaults to 24.18.0 and preinstalls 22.23.2, so the pin adds no download. Keep `.github/workflows/ci.yml` on the same major version.

## Failure signatures

Build command outside the vinext path:

```text
Executing user build command: npm run build
> next build
Success: Build command completed
Executing user deploy command: npx wrangler versions upload --config dist/server/wrangler.json
✘ [ERROR] Could not read file: dist/server/wrangler.json
  ENOENT: no such file or directory, open '/opt/buildhome/repo/dist/server/wrangler.json'
Failed: error occurred while running deploy command
```

The build step reports success because `next build` succeeds. Read the deploy step, not the build step.

## Read build status without Cloudflare credentials

GitHub records every build as the `Workers Builds: personal-site` check run. This gives the outcome and the dashboard link with no Cloudflare token:

```shell
gh api repos/Yoimiya42/Blog/commits/<sha>/check-runs --jq '.check_runs[] | select(.app.name=="Cloudflare Workers and Pages") | "\(.conclusion) \(.details_url)"'
```

## Read build logs

Create a user-scoped API token at `https://dash.cloudflare.com/profile/api-tokens` with `Workers Builds Configuration: Read` and `Workers Scripts: Read`. Account-scoped tokens return an authentication error, and the Wrangler OAuth token does not carry these permissions.

Builds endpoints address the Worker by its immutable tag, not its name. Read the tag from `default_environment.script_tag`.

```shell
curl -s -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/services/personal-site"

curl -s -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/builds/workers/$WORKER_TAG/builds"

curl -s -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/builds/builds/$BUILD_UUID/logs"
```

Revoke the token when the investigation ends.

## Rehearsal evidence

Issue #33 verified the non-production trigger on 2026-09-05 from commit `4f7c006`.

- Failing baseline: ten consecutive builds between 2026-09-04 and 2026-09-05 stopped at the deploy step with the ENOENT signature above. CI had never produced a Worker version.
- Node: the build reported `nodejs@22.23.2`, so `.node-version` overrides the image default of 24.18.0.
- Build: `npm run build:vinext` succeeded on the build image for the first time.
- Deploy: `npx wrangler versions upload` reported 728.10 KiB total, 216.06 KiB gzip, 29 ms startup time, and only the `ASSETS` and `CF_VERSION_METADATA` bindings.
- Version: `4c71bbff-fd7c-41da-af84-712be2495169`.
- Preview alias `https://fix-33-workers-builds-deploy-personal-site.yoimiyacyy.workers.dev` returned HTTP 200.
- The Active Deployment stayed on baseline `faa4fb30-b745-4c61-b3c3-a8699ae55bad` at 100%.

The production trigger was verified on 2026-09-05. `main` commit `57fa62b` reported the `Workers Builds: personal-site` check as `success` at 22:54 UTC, which covers both the build and the deploy command. Build `0074ebca-b9bb-49d5-b789-413a8596d1aa`.

## Official references

- [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Build image](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
- [Builds API reference](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/)
