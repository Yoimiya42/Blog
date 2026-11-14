# CI/CD and environments

Decisions: ADR-0009, ADR-0015. Procedures: `../runbooks/`.

## Environments

| Environment | Runs on | D1 database | Secrets |
|---|---|---|---|
| Local | `wrangler dev` or `vinext dev` | Local SQLite | `.env` |
| Preview | Worker Preview per branch | `blog-preview` | Previews base configuration |
| Production | Worker `personal-site` on `fangmingluan.com` | `blog-production` | Worker secrets |

`wrangler.jsonc` is the source of truth for bindings. Top-level bindings are production; the `previews` block is preview.

## Pipeline

1. A push to any branch runs GitHub Actions job `check`: format, lint, typecheck, unit tests, `next build`, and `build:vinext`.
2. A push to a non-`main` branch also builds a Worker Preview through Workers Builds.
3. A merge to `main` deploys production through Workers Builds with `wrangler deploy`.

Workers Builds does not wait for `check`. The gate is on the merge, not on the deploy.

## Merge gate

Ruleset `protect-main` targets the default branch. It is a GitHub setting, not a file; recreate it at **Settings > Rules > Rulesets**.

| Rule | Value |
|---|---|
| Enforcement | Active, empty bypass list |
| Restrict deletions | On |
| Block force pushes | On |
| Require a pull request | On, zero approvals |
| Require status checks | `check` from GitHub Actions; branch must be up to date |

Only `check` is required. Workers Builds and Vercel are third-party checks and must not block merges.

Verify:

```bash
gh api repos/Yoimiya42/Blog/rules/branches/main --jq '[.[].type]'
```

Expect `deletion`, `pull_request`, `required_status_checks`, and `non_fast_forward`. Verified on 2026-11-14.

## After a merge

Confirm that `main` received a push event and that both checks ran on the merge commit. On 2026-11-13 GitHub returned 502 during a merge: the commit reached `main`, no push event fired, and neither `check` nor Workers Builds ran.

```bash
gh api repos/Yoimiya42/Blog/commits/main/check-runs --jq '.check_runs[] | "\(.name) \(.conclusion)"'
```

## Recovery

Worker rollback and D1 restore: `../runbooks/production-recovery.md`.
