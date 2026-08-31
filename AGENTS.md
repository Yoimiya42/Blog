# AGENTS.md — the single AI rule file

> The only source of AI rules. Claude (Code / Chat / Cowork) and ChatGPT all read this file.
> `CLAUDE.md` is a pointer; put no content there. Change rules only here, and commit the change.

---

## 1. Project

Personal site: homepage, technical blog, mobile-first admin. v1 target 2026-09-30.

## 2. Required reading

| Question | File |
|---|---|
| What to build, v1 scope | `docs/PRD.md` |
| How to structure code | `docs/architecture.md` |
| Why a decision was made | `docs/adr/` |
| Where we compromised | `docs/tech-debt.md` |
| What ships when | `docs/ROADMAP.md` |
| Git, Issue, PR workflow | `CONTRIBUTING.md` |

Revise a settled decision with a new ADR, never by editing an old one.

## 3. Hard constraints

**Mainland China MUST be able to reach the site.** No Google Fonts, Analytics, reCAPTCHA, or other blocked resources. Fonts are self-hosted and subsetted. Primary login is a 6-digit email code, not a magic link. Confirm mainland reachability and record an ADR before adding any third-party dependency or CDN. See ADR-0003.

**All content written or rewritten by AI MUST use concise technical English.** Applies to documentation, rules, comments, config descriptions, and templates.

- Lead with the rule, decision, or outcome.
- Short sentences, clear headings, precise terms.
- No tutorials, filler, repetition, or decorative prose.
- One authoritative location per rule; link to it elsewhere.
- Preserve untouched legacy Chinese content; convert anything rewritten.
- Another language only when the user requires it for product content.

## 4. Working rules

1. New ideas go into `docs/PRD.md` with a version tag before any code.
2. Significant technical decisions get an ADR before implementation.
3. Compromises are recorded in `docs/tech-debt.md` immediately.
4. Documentation ships in the same commit as the code it describes.
5. Ideas outside v1 scope are deferred, not absorbed.
6. Code comments MUST use English and explain non-obvious decisions, not syntax.

## 5. Agent rules

### 5.1 Responsibilities

- **Claude Code** is the primary implementation agent.
- **Claude Chat / Cowork** may inspect code, plan, and edit `docs/`. It MUST NOT edit application code.
- **ChatGPT** may edit documentation and application code.

Branch names follow `CONTRIBUTING.md` and MUST NOT contain actor identity. AI MUST NOT edit `main` directly or merge without authorisation.

### 5.2 Serial execution

1. Run `git status` before starting. Unrelated uncommitted changes: stop and notify the user.
2. AI stages but never commits. See 5.6.
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

AI owns workflow bookkeeping and staging. The user owns commits.

At task start, AI MUST create or select the relevant Issue, create or switch to the correct branch when the worktree is clean, keep a branch the user explicitly selected, and move the Project item to `In progress` when Project access is available.

At each atomic, verified checkpoint, AI MUST run `git add .` and stop, presenting:

- the Issue and branch;
- the staged file list;
- validation results;
- the next checkpoint;
- a `git commit` command in a runnable shell block: one subject line and the co-author trailer, no body.

**AI MUST NOT commit.** The user runs the command. Once the commit exists, AI MAY push the current branch, open or update the PR, and move the Project item to `In review`. AI MUST report every branch, Issue, and PR it creates.

AI MUST NOT merge without explicit authorisation. After merge, AI SHOULD verify Issue closure, set the Project item to `Done`, and delete the branch.
