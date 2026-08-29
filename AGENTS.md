# Blog — 项目上下文（ChatGPT 读这份）

个人网站 + 技术博客 + 移动优先的管理后台。
技术栈：Next.js App Router + TypeScript + Postgres (Neon) + Prisma + Auth.js + Cloudflare R2 + Vercel。
v1 目标上线：2026-09-30。

## 开工前必读

- `docs/00-agent-rules.md` — **多 AI 协作规则，必须遵守**
- `docs/01-requirements.md` — 需求与版本范围，唯一事实来源
- `docs/02-architecture.md` — 架构与工程规范
- `docs/adr/` — 已定的技术决策
- `docs/WORKLOG.md` — 上一次做到哪了

这个项目同时由 Claude 和 ChatGPT 协助开发，两边记忆不互通。开工前先跑 `git status`，工作区不干净就先问人。停下来之前必须 commit，并在 `docs/WORKLOG.md` 追加一条交接记录。

## 硬约束

**中国大陆必须可访问。** 禁用 Google Fonts、Google Analytics、reCAPTCHA 等被墙资源；字体自托管并子集化；登录主方式是邮箱 6 位验证码，不是魔法链接。引入任何新的第三方依赖或 CDN 前，先确认大陆可达，并写进 ADR。

## 工作规矩

1. 任何新想法先写进 `01-requirements.md` 并标注版本，不直接写进代码。
2. 任何重要技术决策先写 ADR，再动手。
3. 任何妥协立刻记进 `tech-debt.md`。
4. 文档改动和代码改动一起提交，不要分开。
5. v1 范围之外的想法一律推后，不要塞进 v1。

## 代码风格

注释默认用英文，关键点中英双语。用户是新手，改动要解释清楚为什么。

## 给 ChatGPT 的额外规则

你只在 `chatgpt/<任务名>` 分支上写代码。不要直接改 `init` 分支，不要自己合并分支——写完交给人工审核。

如果你发现工作区里有未提交的改动，那是 Claude 留下的，不要覆盖，先提醒用户。
