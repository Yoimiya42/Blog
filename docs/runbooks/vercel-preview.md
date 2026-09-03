# Vercel Preview deployment

Deploy a committed Git feature branch to the protected Vercel Preview environment. This verified procedure is a temporary rollback path while Issue #29 establishes the Cloudflare Workers preview. Do not extend it with new platform-specific integrations.

This procedure does not release production traffic or validate mainland China reachability.

## Project baseline

- Vercel project: `blog` in the owner Hobby scope.
- Git repository: `Yoimiya42/Blog`.
- Production branch: `main`.
- Framework preset: Next.js.
- Root directory: repository root.
- Build, output, and install overrides: disabled.
- Node.js: `22.x`.
- Preview Deployment Protection: enabled.

Do not add environment variables until a feature requires them. Never use production data or credentials in Preview.

## Deploy

1. Confirm the current branch is not `main` and the worktree is clean.
2. Run `npm run check`.
3. Commit the verified checkpoint.
4. Push the branch with `git push --set-upstream origin <branch>`.
5. Wait for the GitHub Actions `Quality gates` job and Vercel deployment status.

A push to a non-production branch must create a Preview deployment. It must not change the deployment assigned to production traffic.

## Verify

Confirm all items before sharing the deployment for review:

- Vercel status is `Ready`.
- Environment is `Preview`, not `Production`.
- Branch and commit SHA match the pushed checkpoint.
- Build logs show Node.js 22, dependency installation, Next.js detection, and a successful `next build`.
- Build Output contains the expected routes and artifacts.
- The protected URL opens for an authorised Vercel user.
- The homepage renders and an unknown route returns the application 404 page.
- GitHub Actions passes for the same commit.

An unauthenticated redirect to Vercel login is expected while Deployment Protection is enabled. A generated `*.vercel.app` URL is preview evidence only and must not be used as mainland China release evidence.

## Diagnose failures

- Production deployment created: verify the pushed branch is not `main` and confirm Production Branch tracking.
- Framework or command mismatch: restore the Next.js preset and disable build overrides.
- Runtime mismatch: set Node.js to `22.x` in Project Settings, then redeploy the same commit.
- Build failure: compare Vercel logs with `npm run check`; do not redeploy uncommitted local changes.
- Protected URL unavailable after login: verify project membership and Deployment Protection settings.

## Rehearsal evidence

On 2026-09-03, commit `aab1d47` deployed from `build/27-vercel-preview`. GitHub recorded environment `Preview` with `production_environment: false`. GitHub Actions passed, Vercel completed the deployment, and unauthorised access redirected to Vercel login.

## Official references

- [Deploying Git repositories](https://vercel.com/docs/git)
- [Deployment environments](https://vercel.com/docs/deployments/environments)
- [Configuring a build](https://vercel.com/docs/builds/configure-a-build)
- [Supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Deployment Protection](https://vercel.com/docs/deployment-protection)
