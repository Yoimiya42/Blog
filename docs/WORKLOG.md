# 工作日志 / 交接记录

每次 AI 会话结束前追加一条。格式：日期 · 谁 · 分支，然后「做了 / 没做完 / 下一步」。
新的记录加在最上面。

---

## 2026-08-29 · Claude (Cowork) · init

做了：
- 建立多 AI 协作规则 `docs/00-agent-rules.md`
- 根目录加 `CLAUDE.md` 和 `AGENTS.md`，两边入口指向同一套规则
- 加 `.gitignore`
- 清理了两个残留的 git worktree 和一个卡住的 `.git/index.lock`
- 删掉了空的 `CHANGELOG.md`，由本文件取代

没做完：代码还一行没写，项目骨架还没搭。

下一步：解决 `01-requirements.md` 第 8 节里阻塞 v1 开工的待决问题（OQ-01 域名、OQ-02 视觉风格、OQ-03 编辑器选型、OQ-05 是否双语），然后再 `create-next-app`。
