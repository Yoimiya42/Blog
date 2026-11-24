# 0025. Media deletion and reference safety

- **Status**: Accepted; deletion order superseded by 0033
- **Date**: 2026-11-18
- **Requirements**: FR-ADMIN-08
- **Supersedes**: —

## Context

Posts reference media only by `mediaId` inside TipTap JSON (ADR-0010); no join table exists. Deleting an object that a post shows breaks that post. Public variants are cached for a year as `immutable` (ADR-0023), so a deleted image cannot be recalled from browsers.

## Decision

- References are found at delete time by scanning the content of every non-deleted post, drafts included.
- A referenced item is deleted only after a second, explicit confirmation that names each referencing post.
- Deletion sets `deleted_at`, clears the GPS columns, then deletes the R2 object. A failed object delete is logged as `media.orphan`; the row stays deleted.
- The row is kept and ids are never reused. Saving a post accepts any id ever stored; publishing requires live media. A post already public that shows a deleted image renders "Image unavailable" until the owner removes the node.
- Cached variants are not purged. They expire on their own (TD-006).

## Trade-offs

- **Gain**: No schema change. Deletion never blocks editing.
- **Accept**: The scan reads every post body; acceptable at personal-blog volume. Cached copies outlive deletion.
- **Reversal**: Low — a reference table can replace the scan without changing the contract.

## Rejected alternatives

- Reference table maintained on save: a second write path to keep consistent for no v1 benefit.
- Blocking deletion of referenced items: forces the owner to edit every post first.
