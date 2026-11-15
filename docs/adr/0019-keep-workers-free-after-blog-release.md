# 0019. Keep Workers Free after the public blog ships

- **Status**: Accepted
- **Date**: 2026-11-15
- **Requirements**: FR-BLOG-01, FR-BLOG-03, PRD 6.6
- **Supersedes**: ADR-0014's "move production to Workers Paid before the public blog ships"

## Context

ADR-0014 planned the Workers Paid upgrade for the public blog release. The Worker Preview for PR #57 measured 94 requests. Every route exceeded the 10 ms Free limit at the median, from 14 ms for a tag archive to 54 ms for the admin, with a maximum of 156 ms. No request ended with an exceeded-CPU outcome. Server rendering dominates the cost; code highlighting is not the main factor.

## Decision

Keep production on Workers Free when the public blog ships. Workers Logs records CPU time and outcome for every production request. The first exceeded-CPU outcome, or public promotion of the site, triggers Issue #58: choose Workers Paid or cached public HTML.

## Trade-offs

- **Gain**: No hosting cost while traffic is low, and the choice between paying and caching is made from production data.
- **Accept**: Public routes depend on undocumented tolerance of CPU overruns. A visitor may see error 1102 before the trigger fires. Recorded as TD-002.
- **Reversal**: Low — the plan changes in the dashboard without a code change.
