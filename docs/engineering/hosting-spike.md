# Hosting validation spike

> Status: In progress · Issue #4 · ADR-0006

Select the v1 host, Prisma major version, and image pipeline from one controlled comparison. Deploy the same application commit and test data to both candidates.

## Decision boundary

- Compare Vercel Hobby with Cloudflare Workers.
- Evaluate vinext first because Cloudflare recommends it for new applications. Test OpenNext when a recorded vinext gap blocks the slice.
- Keep Neon PostgreSQL and R2 fixed across both deployments.
- Do not enable a paid Workers plan without owner approval.
- Do not use provider domains for mainland evidence.
- Do not use the production owner identity or private media.

## Verified starting state

| Item            | State                                                                            |
| --------------- | -------------------------------------------------------------------------------- |
| Application     | Next.js 16.3.4, strict TypeScript, Node.js 22                                    |
| vinext          | 1.0.0-beta.8; compatibility check reports 83% and only requires ESM package mode |
| Vercel          | Hobby account; repository visible; no project imported                           |
| Cloudflare      | Account available; `fangmingluan.com` registration active                        |
| R2              | Subscription active; no bucket; no billable usage                                |
| Neon            | Project `Blog`; AWS Singapore; Neon Auth disabled                                |
| Mainland tester | Available                                                                        |

The isolated Neon branch `issue-4-hosting-spike` expires on 2026-09-09. All spike migrations and test identities use this branch.

## Representative slice

The slice MUST expose the same routes and behavior on both hosts.

| Capability       | Verification                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Next.js runtime  | Dynamic server render and route handler return a request id and server timestamp                             |
| Prisma and Neon  | Write and read one disposable probe row; return only its opaque id and measured duration                     |
| Authentication   | Better Auth sends a six-digit code to a preview-only test identity and persists the session and rate limit   |
| R2               | Generate a short-lived upload operation, verify metadata, read the object, and delete the disposable object  |
| Media processing | Process non-private HEIC and oriented JPEG fixtures; enforce size limits; remove GPS EXIF; emit WebP or AVIF |
| Delivery         | Render the processed image with explicit dimensions from the R2 custom domain                                |

Test server-side `sharp` and browser preprocessing separately. A pipeline passes only when orientation, metadata removal, output dimensions, size, and visual quality are verified.

## Environments

| Candidate          | Test hostname                    |
| ------------------ | -------------------------------- |
| Vercel             | `vercel-spike.fangmingluan.com`  |
| Cloudflare Workers | `workers-spike.fangmingluan.com` |
| R2 media           | `media-spike.fangmingluan.com`   |

Use preview-only secrets. Store no connection string, password, token, OTP, account id, or provider hostname in Git, GitHub, screenshots, or evidence.

## Measurement protocol

Test the dynamic page, database probe, and R2 image on the same commit.

- UK: test one fixed wired or Wi-Fi network and one mobile viewport.
- Mainland China: test Wi-Fi and mobile data with VPN and proxy disabled.
- Record city, carrier, device, browser, timestamp, and deployment commit. Do not record an IP address.
- Measure a cold request after the database has scaled to zero, then three warm requests.
- Record DNS, TLS, TTFB, FCP, LCP, status, missing assets, and visible errors.
- Confirm all CSS, JavaScript, fonts, and images load from permitted custom domains.
- Record function duration, CPU time, bundle size, error rate, and estimated monthly cost from each provider.

The v1 mainland gate is LCP below five seconds with complete content. A tester uses an isolated preview identity for login. Visitor registration and comments are tested from v1.5.

## Decision gates

A candidate fails when any condition is true:

- A required route or dependency is incompatible with its runtime.
- The custom application or media domain is unreliable from mainland China.
- Prisma, OTP, durable rate limiting, or R2 signed operations fail.
- The image pipeline cannot meet orientation, privacy, size, or quality requirements.
- The expected annual cost exceeds the approved budget.

When both candidates pass, prefer lower operational complexity, then lower mainland and UK latency, then lower cost. Record the result in a follow-up ADR. Keep raw measurements in this file until the ADR is accepted.

## Evidence

| Candidate  | Commit  | Runtime path              | UK result | Mainland result | Cost    | Outcome |
| ---------- | ------- | ------------------------- | --------- | --------------- | ------- | ------- |
| Vercel     | Pending | Native Next.js            | Pending   | Pending         | Pending | Pending |
| Cloudflare | Pending | vinext; OpenNext fallback | Pending   | Pending         | Pending | Pending |

### Local integration

| Date       | Check                         | Result                                                                                     |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| 2026-09-02 | Prisma 7.10 migration         | Passed against the isolated Singapore branch                                               |
| 2026-09-02 | Owner seed                    | Passed twice; the second run confirmed idempotence without transactions                    |
| 2026-09-02 | Dynamic database route        | Passed with the WebSocket adapter; three warm queries reported 665 ms, 257 ms, and 163 ms   |
| 2026-09-02 | Better Auth database adapter  | Passed twice with `200`; the database rate-limit counter advanced to two                    |
| 2026-09-02 | Authentication host allowlist | Passed; `localhost:3000` worked and an unlisted host was rejected                            |
| 2026-09-02 | Neon HTTP transaction support | Failed; Better Auth atomic rate-limit updates require transactions                          |
| 2026-09-02 | Neon WebSocket pool adapter   | Passed locally; retain for Vercel and Cloudflare deployment verification                    |

## References

- [ADR-0006](../adr/0006-hosting-platform-spike.md)
- [Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare OpenNext guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [Prisma Neon guide](https://www.prisma.io/docs/orm/overview/databases/neon)
- [Vercel Next.js guide](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [R2 presigned URL guide](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
