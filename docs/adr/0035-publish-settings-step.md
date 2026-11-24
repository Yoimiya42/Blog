# 0035. Publish settings step

- **Status**: Accepted
- **Date**: 2026-11-24
- **Requirements**: FR-ADMIN-03, FR-ADMIN-04, FR-ADMIN-07, FR-ADMIN-18, FR-ADMIN-20, FR-ADMIN-23
- **Supersedes**: none

## Context

The editor showed a settings sidebar and Save, Publish, and Unpublish buttons beside the text. The owner rarely touches settings while writing, and autosave already covers the body. The sidebar takes space and attention from writing.

## Decision

- The edit view holds the title and body only. Cover, pin, tags, slug, summary, and stats move to a publish settings dialog opened from the editor header.
- The dialog publishes a draft or updates a published post. It also saves a draft's settings without publishing.
- Settings state lives in the form, so closing the dialog keeps unsaved choices; hidden inputs carry them on every save.
- Draft autosave covers the title as well as the body. A blank title is not autosaved.
- No Save button. Ctrl or Cmd+S saves a draft and opens the dialog for a published post.
- Unpublish moves to a row menu in the post list.
- Published posts open in Preview; drafts open in Edit.

## Trade-offs

- **Gain**: A clear writing surface; one place for publish decisions and future fields.
- **Accept**: Settings edits need a dialog round trip.
- **Reversal**: Low — the fields are unchanged; only their placement moves.

## Rejected alternatives

- A separate settings page: leaving the editor loses the unsaved body state.
- Collapsible sidebar: still visible, still competes with the text.
