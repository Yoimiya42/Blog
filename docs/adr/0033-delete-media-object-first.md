# 0033. Delete the media object before the row

- **Status**: Accepted
- **Date**: 2026-11-24
- **Requirements**: FR-ADMIN-08
- **Supersedes**: 0025, deletion order only

## Context

ADR-0025 marked the row deleted, then deleted the R2 object and only logged a failure. `/media` reads R2 without D1, so a failed object delete left the image public while the library reported it deleted, and the hidden row could not be deleted again.

## Decision

Delete the R2 object first, then mark the row. Either failure is reported to the owner and leaves the row live. Deleting again finishes the job: R2 reports success for a missing key. The `media.orphan` event now comes from uploads only.

## Trade-offs

- **Gain**: Every failure is visible and retried from the same control.
- **Accept**: After a failed row update, the library and posts show a broken image until the owner deletes it again.
- **Reversal**: Low — swap two calls.

## Rejected alternatives

- Undo the mark when the object delete fails: a second write that can itself fail.
