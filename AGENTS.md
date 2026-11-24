# AGENTS.md — the single AI rule file

> The only source of AI rules. Claude (Code / Chat / Cowork) and Codex all read this file.
> `CLAUDE.md` is a pointer; put no content there. Change rules only here, and commit the change.

---

## 1. Project

Personal site: homepage, technical blog, mobile-first admin. Milestones are undated and ordered by exit condition; see `docs/ROADMAP.md`.

## 2. Required reading

| Question | File |
|---|---|
| What to build, v1 scope | `docs/PRD.md` |
| How to structure code | `docs/architecture.md` |
| Why a decision was made | `docs/adr/README.md`, then only relevant records |
| Where we compromised | `docs/tech-debt.md` |
| What ships when | `docs/ROADMAP.md` |
| Git, Issue, PR workflow | `CONTRIBUTING.md` |
| How to run the site locally | `docs/runbooks/local-development.md` |

Revise a settled decision with a new ADR, never by editing an old one.
Use the ADR index to select records. Do not preload every ADR.

## 3. Hard constraints

**Mainland China access is preserved by prevention, not by a release gate.** No Google Fonts, Analytics, reCAPTCHA, or other known-blocked resources. Fonts are self-hosted and subsetted. Primary login is a 6-digit email code, not a magic link. First paint never depends on a third party. Record an ADR before adding any third-party dependency or CDN; record its mainland reachability when known. Mainland tests are recorded, not required to pass. See ADR-0003 and ADR-0020.

**All content written or rewritten by AI MUST use concise technical English.** Applies to documentation, rules, comments, config descriptions, and templates.

- Lead with the rule, decision, or outcome.
- Short sentences, clear headings, precise terms.
- No tutorials, filler, repetition, or decorative prose.
- One authoritative location per rule; link to it elsewhere.
- Preserve untouched legacy Chinese content; convert anything rewritten.
- Another language only when the user requires it for product content.

## 4. Working rules

1. New ideas go into `docs/PRD.md` with a version tag before any code.
2. Significant technical decisions get an ADR before implementation. Follow the scope and length rules in `docs/adr/README.md`.
3. Compromises are recorded in `docs/tech-debt.md` immediately.
4. Documentation ships in the same commit as the code it describes.
5. Ideas outside v1 scope are deferred, not absorbed.
6. Code comments MUST use English and explain non-obvious decisions, not syntax.

## 5. Agent rules

### 5.1 Responsibilities

- **Claude Code** is the only implementation agent. It owns application code and may edit documentation.
- **Codex** is the reviewer. It reviews code and MAY edit documentation, including notes addressed to Claude Code. It MUST NOT edit application code.
- **Claude Chat / Cowork** may inspect code, plan, and edit `docs/`. It MUST NOT edit application code.

Application code is everything outside `docs/` and the root Markdown files.

Branch names follow `CONTRIBUTING.md` and MUST NOT contain actor identity. AI MUST NOT edit `main` directly or merge without authorisation.

`D:\BlogDemo` is frozen. It is read-only reference material. AI MUST NOT extend it. Nothing in it is a decision until it is recorded in `docs/PRD.md` or an ADR.

### 5.2 Serial execution

1. Run `git status` before starting. Unrelated uncommitted changes: stop and notify the user.
2. AI commits, pulls, and creates and switches branches under 5.6. Before switching, the worktree MUST be clean: commit or stop, never discard.
3. The worktree MUST be clean before handing off to another AI.
4. No concurrent AI work sessions.

### 5.3 Prohibited

- `git push --force`; `git reset --hard` on others' commits.
- Deleting or rewriting existing decisions in `docs/`. Append only.
- Third-party dependencies or CDNs unreachable from mainland China.
- Changes to `.claude/` or `.git/` internals.
- Experimental work on `main`.
- Additional rule files (`.cursorrules`, `.github/copilot-instructions.md`, and similar).

### 5.4 Conflict resolution

Git is the arbiter; `main` wins.

- Uncommitted work overwritten: it is gone. Redo it.
- Merge conflict: a human decides. AI MUST NOT choose automatically.
- Contradictory documents: the newest ADR wins. Fix the stale document immediately.

### 5.5 Branches and commits

Naming, lifecycle, merge strategy, and commit format: `CONTRIBUTING.md`.

### 5.6 Workflow automation

AI owns the Git workflow except merge. The user owns merge.

At task start, AI MUST create or select the relevant Issue and move the Project item to `In progress` when Project access is available. AI branches from the latest `main` with a name that follows `CONTRIBUTING.md`, or switches to the existing branch of that Issue and pulls.

At each atomic, verified checkpoint, AI commits: one Conventional Commit subject line and the co-author trailer, no body. AI then pushes the current branch, opens or updates the PR, and moves the Project item to `In review` once the PR is open.

Every AI reply that changes the repository or GitHub ends with:

- the Issue and PR it worked on;
- a summary of the changes made in that reply;
- validation results;
- every Issue, branch, commit, and PR it created.

AI MUST NOT merge without explicit authorisation. After merge, AI SHOULD verify Issue closure, set the Project item to `Done`, and delete the branch.
