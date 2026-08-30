# Contributing

This document defines the Git and GitHub workflow. AI-specific operating rules remain in `AGENTS.md`.

## 1. Workflow

1. Create or select a ready GitHub Issue.
2. Create one short-lived branch from the latest `main`.
3. Make small, verified commits.
4. Open a Pull Request and complete the template.
5. Resolve review comments and required checks.
6. Squash-merge into `main`, then delete the branch.

Direct changes to `main` are not allowed.

## 2. Issues

Use one Issue for one independently verifiable outcome. Large outcomes MUST be split into sub-issues.

An Issue is ready when it contains:

- a clear outcome;
- testable acceptance criteria;
- explicit out-of-scope items;
- relevant FRs, ADRs, dependencies, or reproduction steps.

Feature titles MUST include the requirement ID:

```text
[FR-BLOG-03] add code highlighting
```

Bug titles MUST describe the observable failure:

```text
image upload fails on iOS Safari
```

## 3. Branches

Use lowercase names with hyphens:

```text
chatgpt/<issue>-<slug>
claude/<issue>-<slug>
human/<issue>-<slug>
```

Example: `chatgpt/123-blog-editor`.

One branch SHOULD address one Issue. Documentation preparation without an Issue MAY omit the number. Force-pushing shared branches is prohibited.

## 4. Commits

Use Conventional Commits:

```text
<type>[optional scope]: <description>
```

Allowed types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`, `revert`.

Commit messages MUST:

- be written in English;
- use an imperative, lowercase description without a period;
- keep the subject within 50 characters;
- represent one logical change.

Use the body only to explain non-obvious reasons or trade-offs. Temporary WIP commits MUST be removed by squash merge.

```text
feat(blog): add tag filtering
fix(admin): preserve failed upload draft
docs: record editor decision
```

## 5. Pull Requests

The PR title MUST follow the commit format because it becomes the squash commit title.

A PR MUST:

- link its primary Issue with `Closes #<number>`;
- address one primary outcome;
- describe verification, risk, and rollback;
- include screenshots or a preview link for UI changes;
- update related requirements, ADRs, and technical debt in the same PR;
- pass all configured required checks.

Use a draft PR for incomplete work. The repository owner performs the final review and merge unless explicitly delegated.

## 6. Tracking

GitHub Project is the source of truth for current progress. `docs/ROADMAP.md` records version scope, not daily status.

```text
Backlog -> Ready -> In progress -> In review -> Done
```

Milestones represent releases. Recommended fields are Priority, Size, and Target version.

## 7. Merge and Completion

Before merge, acceptance criteria MUST pass, review threads MUST be resolved, and documentation MUST be current.

Use squash merge and delete the source branch. After merge, close the Issue, set the Project item to `Done`, and verify the target environment when deployment is involved.

## 8. Automation Boundary

AI maintains Issues, branches, Project status, and Pull Requests. The repository owner approves each exact commit diff and message.

Unless the user restricts it, commit approval also authorizes the AI to commit, push the current branch, and open or update its PR. It never authorizes merge. Merge requires explicit approval.

AI MUST report every created or completed Issue, branch, commit, and PR.
