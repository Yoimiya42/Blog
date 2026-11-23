# 0030. Blank draft on New post

- **Status**: Accepted
- **Date**: 2026-11-23
- **Requirements**: FR-ADMIN-23
- **Supersedes**: —

## Context

Autosave needs a stored row, and a post row needs a title and a slug (database checks). A new post therefore stayed unsaved until the owner pressed Create draft, so text typed before that could be lost.

## Decision

- Opening New post creates a draft at once through a server action: title `Untitled`, slug `untitled-` plus six random hex characters, empty document. The editor opens on it with the title selected.
- An untouched blank draft (placeholder title and slug, empty document, no tags) is reused, so repeated clicks leave at most one.
- Publishing is refused while the slug is still a placeholder.
- The creation runs from the client after the page mounts, never during a GET render, so route prefetching cannot create rows.

## Trade-offs

- **Gain**: Autosave covers every keystroke of a new post.
- **Accept**: At most one empty draft can remain in the list.
- **Reversal**: Low — the old form path still exists for `postId === null`.

## Rejected alternatives

- Allow empty titles and slugs on drafts — needs a table rebuild in D1 to relax the checks.
- Create the row on first keystroke from the client — the editor would have to change identity mid-typing.
