# AGENTS.md — 本项目唯一的 AI 规则文件

> **这份文件是所有 AI 助手的唯一规则来源。**
> Claude（Code / Chat / Cowork 模式）和 ChatGPT 都读这一份。
> `CLAUDE.md` 只是一个指向这里的指路条，不要往它里面写内容。
> 要改规则，只能改这份文件，不要新建自己的规则文件。改完要提交。

---

## 1. About this project

个人网站 + 技术博客 + 移动优先的管理后台。
v1 目标上线：2026-09-30。

## 2. 开工前必读

| 想知道什么 | 去看哪个文件 |
|---|---|
| 要做什么功能、v1 范围 | `docs/PRD.md` |
| 怎么分层、怎么写 | `docs/architecture.md` |
| 为什么这么选 | `docs/adr/` |
| 哪里凑合了 | `docs/tech-debt.md` |
| 什么时候做什么 | `docs/ROADMAP.md` |
| Git、Issue、PR 怎么走 | `CONTRIBUTING.md` |

想改已经定下来的决策，写一份新 ADR，不要直接改旧的。

## 3. 硬约束

**中国大陆必须可访问。** 禁用 Google Fonts、Google Analytics、reCAPTCHA 等被墙资源；字体自托管并子集化；登录主方式是邮箱 6 位验证码，不是魔法链接。引入任何新的第三方依赖或 CDN 前，先确认大陆可达，并写进 ADR。详见 ADR-0003。

**All repository content written or rewritten by AI MUST use concise technical English.** This project-level hard constraint applies to documentation, rules, comments, configuration descriptions, Issue templates, and PR templates.

- Lead with the rule, decision, or outcome.
- Use short sentences, clear headings, and precise terms.
- Remove tutorials, conversational filler, repetition, and decorative prose.
- Keep each rule in one authoritative location; link to it elsewhere.
- Preserve untouched legacy Chinese content; convert any rewritten content to English.
- Use another language only when the user explicitly requires it for product content.

## 4. 工作规矩

1. 任何新想法先写进 `docs/PRD.md` 并标注版本，不直接写进代码。
2. 任何重要技术决策先写 ADR，再动手。
3. 任何妥协立刻记进 `docs/tech-debt.md`。
4. 文档改动和代码改动一起提交，不要分开。
5. v1 范围之外的想法一律推后，不要塞进 v1。
6. Code comments MUST use English and explain non-obvious decisions, not syntax.

---

### 5.1 Responsibilities

- **Claude Code** is the primary implementation agent.
- **Claude Chat / Cowork** may inspect code, plan work, and edit `docs/`. It MUST NOT edit application code.
- **ChatGPT** may edit documentation and application code.

All AIs MUST use the work-driven branch format defined in `CONTRIBUTING.md`. Actor identity MUST NOT appear in branch names.

AI MUST NOT edit `main` directly or merge without authorization. If unrelated uncommitted changes exist, stop and notify the user.

### 5.2 Serial execution

1. Run `git status` before work. If unrelated uncommitted changes exist, stop and notify the user.
2. **AI MUST obtain explicit approval for the exact commit message and diff before committing.**
3. The worktree MUST be clean before switching to another AI.
4. Do not run multiple AI work sessions concurrently.

### 5.4 禁止事项

- 不要 `git push --force`，不要 `git reset --hard` 别人的提交。
- 不要删除或重写 `docs/` 里已有的决策，只能追加。
- 不要引入中国大陆不可达的第三方依赖或 CDN。
- 不要动 `.claude/`、`.git/` 内部文件。
- 不要在 `main` 分支上做实验性大改，开分支。
- 不要新建自己的规则文件（`.cursorrules`、`.github/copilot-instructions.md` 之类）。规则只有这一份。

### 5.5 冲突了怎么办

git 是唯一裁判，`main` 分支为准。

- 工作区被覆盖但还没提交 → 内容找不回来了，重做。这就是为什么 5.2 要频繁提交。
- 分支合并冲突 → 由人来决定保留哪边，不要让 AI 自动选。
- 两份文档说法不一致 → 以 `docs/adr/` 里最新的 ADR 为准，然后立刻改掉旧文档。

### 5.6 分支约定

分支命名、生命周期和合并方式以 `CONTRIBUTING.md` 为准。

### 5.7 Commit messages

Commit and PR title rules are defined in `CONTRIBUTING.md`. AI MUST follow the approval boundary in section 5.8.

### 5.8 Automated workflow management

AI owns workflow bookkeeping. The user approves commits.

At task start, AI MUST:

- create or select the relevant Issue when the task warrants one;
- create or switch to the correct branch when the worktree is clean;
- keep a branch explicitly selected by the user;
- move the Project item to `In progress` when Project access is available.

AI MUST stop at each atomic, verified checkpoint and request commit approval with:

- the Issue and branch;
- the exact commit message;
- the exact file list;
- validation results;
- the next checkpoint.

Approval applies only to the presented diff and message. Any later change requires new approval.

After approval, AI MAY commit, push the current branch, open or update the PR, and move the Project item to `In review`. AI MUST report created branches, Issues, commits, and PRs.

AI MUST NOT merge without explicit authorization. After merge, AI SHOULD verify Issue closure, set the Project item to `Done`, and delete the merged branch.
