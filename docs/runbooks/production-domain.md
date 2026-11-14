# Production domain and DNS

Dashboard-only settings for zone `fangmingluan.com`. None of them is in version control; recreate them from this file. Dashboard path: **Cloudflare > fangmingluan.com**.

## DNS records

| Name | Type | Content | Proxy | Purpose |
|---|---|---|---|---|
| `fangmingluan.com` | Worker | `personal-site` | Proxied | Production custom domain |
| `www` | AAAA | `100::` | Proxied | Placeholder so the redirect rule receives traffic |
| `_dmarc` | TXT | `v=DMARC1; p=quarantine;` | DNS only | DMARC policy |
| `resend._domainkey` | TXT | Resend DKIM public key | DNS only | DKIM |
| `send` | CNAME | `send.forge.rmta.net` | DNS only | Resend SPF and bounce handling |
| `rsend` | CNAME | `rsend-euw1.forge.rmta.net` | DNS only | Resend tracking host |

`life.fangmingluan.com` has no record. `media-spike` belongs to the Issue #4 spike and is outside this runbook.

## Redirects

- **Rules > Redirect Rules**: template `Redirect from WWW to root`. Request URL `https://www.*`, target `https://${1}`, status 301, query string preserved.
- **SSL/TLS > Edge Certificates > Always Use HTTPS**: on. The redirect rule matches HTTPS only, so plain HTTP depends on this switch.

The `www` record must exist and be proxied before the rule deploys. Without the rule, `www` returns 522.

## Verification

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "https://www.fangmingluan.com/x?a=1"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://fangmingluan.com/"
curl -s -H "accept: application/dns-json" "https://cloudflare-dns.com/dns-query?name=_dmarc.fangmingluan.com&type=TXT"
```

Expect `301 https://fangmingluan.com/x?a=1`, `301 https://fangmingluan.com/`, and the DMARC policy.

## Evidence

Verified on 2026-11-14:

- `https://www.fangmingluan.com/x?a=1` returned 301 to `https://fangmingluan.com/x?a=1` with a valid certificate.
- `http://fangmingluan.com/` returned 301 to HTTPS. Before Always Use HTTPS it returned 200 over plain HTTP.
- `http://www.fangmingluan.com/` reached `https://fangmingluan.com/` in two redirects.
- `www` and `life` lookups matched the table above. `_dmarc` was published as `p=none`, then tightened to `p=quarantine` after Gmail reported DMARC `PASS`.

Mail delivery, verified on 2026-11-14 after `main` commit `7f19d86` deployed:

- The owner signed in on `https://fangmingluan.com/login` and reached `/admin`. `blog-production` held one session row afterwards.
- Gmail delivered the code from `noreply@fangmingluan.com` to the inbox within one second. Gmail reported SPF `PASS`, DKIM `PASS` with domain `fangmingluan.com`, and DMARC `PASS`.
- QQ Mail and 163 Mail are not tested. ADR-0016 moves those tests to the release that opens login to visitors.

## Open items

- None.
