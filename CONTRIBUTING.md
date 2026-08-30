# Contributing

Git and GitHub workflow. AI-specific rules: `AGENTS.md`.

## 1. Workflow

1. Create or select a ready Issue.
2. Branch from the latest `main`.
3. Make small, verified commits.
4. Open a PR and complete the template.
5. Resolve review comments and required checks.
6. Squash-merge, then delete the branch.

Direct changes to `main` are not allowed.

## 2. Issues

One Issue, one independently verifiable outcome. Larger outcomes are split into sub-issues.

An Issue is ready when it states the outcome, testable acceptance criteria, explicit out-of-scope items, and relevant FRs, ADRs, dependencies, or reproduction steps.

Feature titles carry the requirement ID; bug titles describe the observable failure:

```text
[FR-BLOG-03] add code highlighting
image upload fails on iOS Safari
```

## 3. Branches

Named by work, not contributor:

```text
<type>/<issue>-<outcome>

feat/123-blog-editor
fix/124-image-upload
docs/125-workflow-rules
```

Types match Conventional Commits. The Issue number identifies the tracked Project item. One branch maps to one primary Issue and one PR. Omitting the Issue number requires explicit approval.

## 4. Commits

Conventional Commits: `<type>[optional scope]: <description>`.

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`, `revert`.

Messages MUST be English, imperative, lowercase, without a trailing period, within 50 characters, and cover one logical change. Use the body only for non-obvious reasons or trade-offs. Squash merge removes WIP commits.

```text
feat(blog): add tag filtering
fix(admin): preserve failed upload draft
docs: record editor decision
```

## 5. Pull requests

The PR title follows the commit format; it becomes the squash commit title.

A PR MUST:

- link its primary Issue with `Closes #<number>`;
- address one primary outcome;
- describe verification, risk, and rollback;
- include screenshots or a preview link for UI changes;
- update related requirements, ADRs, and technical debt in the same PR;
- pass all required checks.

Incomplete work goes in a draft PR. The repository owner performs the final review and merge unless explicitly delegated.

## 6. Tracking

GitHub Project is the source of truth for progress. `docs/ROADMAP.md` records release scope, not daily status.

```text
Backlog -> Ready -> In progress -> In review -> Done
```

Milestones represent releases. Recommended fields: Priority, Size, Target version.

## 7. Merge

Before merge: acceptance criteria pass, review threads resolved, documentation current.

Squash-merge and delete the branch. After merge, close the Issue, set the Project item to `Done`, and verify the target environment when a deployment is involved.

## 8. Automation boundary

AI maintains Issues, branches, Project status, and PRs. The owner approves each exact commit diff and message.

Unless restricted, commit approval also authorises the AI to commit, push the current branch, and open or update its PR. It never authorises merge; merge requires explicit approval.

AI MUST report every Issue, branch, commit, and PR it creates or completes.
