# 个人网站 · 需求规格说明书

> 版本 v0.2 · 起草日期 2026-08-29 · 状态：草稿，待逐节确认
> 本文档是项目的唯一需求来源。任何功能开始编码前，必须先在这里有对应条目。

---

## 1. 项目定位

### 1.1 一句话定位

一个克制、专业的学术与求职主页，在角落里藏着一个私人的兴趣宇宙。

### 1.2 目标访客

| 编号 | 访客类型 | 他们想要什么 | 他们会看哪里 | 优先级 |
|---|---|---|---|---|
| P1 | 招聘方 / 教授 / 学术同行 | 30 秒内判断「这人靠不靠谱」 | 个人主页、技术博客 | 最高 |
| P2 | 认识的朋友 | 看看你最近在干嘛、在看什么 | 碎碎念、清单、画廊 | 高 |
| P3 | 偶然到访的陌生同好 | 从一篇技术文章或一张照片进来，发现别有洞天 | 全站 | 中 |
| P4 | 你自己 | 一个能长期记录、随时随地能更新的地方 | 管理后台 | 最高 |

### 1.3 成功标准

- P1 类访客在个人主页停留后，能准确说出你是谁、会什么、做过什么。
- 你能在手机上、在外面、5 分钟内发布一条内容，且不觉得别扭。
- 半年后你还在更新它。（这是最难也最真实的标准，所有设计决策以它为准。）

### 1.4 设计原则

1. **两层人格**：外层正式克制，内层自由个人。两层视觉语言明确不同，切换时要有仪式感。
2. **移动优先**：不只是「手机上能看」，而是「手机上能写」。后台设计从手机屏幕开始画。
3. **内容优先**：任何特效不能拖慢首屏，不能干扰阅读。
4. **可长期维护**：宁可功能少，不可流程繁琐。加一条内容的成本决定这个网站的寿命。
5. **大陆可达**：全站不依赖任何在中国大陆无法访问的资源。见 6.1。
6. **为变化留位置，不为幻想做抽象**：只在已识别的变化点上留扩展口，其余地方直白地写。见 `02-architecture.md` 第 1 节。

---

## 2. 范围与版本划分

### 2.1 v1（MVP，目标 2026-09-30 前上线）

只做三件事，做透：

- 正式个人主页（P1 访客的落地页）
- 技术博客（列表、详情、标签）
- 管理后台（手机优先，能写、能传图、能发布）

外加：域名、部署、账号系统骨架（先只有你自己一个用户）、树洞入口的第一版。

**v1 明确不做**：人生清单、摄影画廊、碎碎念、访客登录、评论、评分、悄悄话、订阅、暗色模式、多语言。

### 2.2 v1.5（约 2026-10 月）

- 碎碎念板块（图文短内容，手机端发布体验做到最好）
- 访客登录（GitHub + 邮箱验证码）
- 评论系统（多态，一套代码服务所有内容类型）

### 2.3 v2（约 2026-11 至 12 月）

- 人生清单四个子板块（电影、读书、游戏、旅行）
- 访客对条目的评分与短评
- 条目封面自动抓取脚本

### 2.4 v2.5（2027 年初）

- 摄影画廊（分类、EXIF、大图查看、瀑布流）
- 悄悄话留言箱
- 更新订阅（邮件 / 站内）
- 暗色模式、RSS、旅行地图

### 2.5 明确不做（Out of Scope）

- 不做多用户内容发布，只有你能发内容。
- 不做站内私信互发，悄悄话是单向的（访客 → 你）。
- 不做 ICP 备案，不部署国内服务器。接受大陆访问速度较慢。
- 不做「登录可见 / 好友可见」的内容分层（本轮确认不需要）。但数据表预留 `visibility` 字段，以后想加不用改结构。
- 不做移动 App，只做响应式网页。

---

## 3. 信息架构

### 3.1 站点地图与 URL

| URL | 页面 | 版本 | 说明 |
|---|---|---|---|
| `/` | 个人主页 | v1 | 全站主入口，正式简历风格 |
| `/blog` | 技术博客列表 | v1 | 分页、按标签筛选 |
| `/blog/[slug]` | 文章详情 | v1 | slug 由标题生成，一旦发布不再改 |
| `/blog/tags/[tag]` | 标签归档 | v1 | |
| `/admin` | 管理后台首页 | v1 | 需登录，移动优先 |
| `/admin/posts` | 文章管理 | v1 | 列表、新建、编辑、删除 |
| `/admin/posts/[id]/edit` | 编辑器 | v1 | |
| `/admin/media` | 图片管理 | v1 | |
| `/moments` | 碎碎念 | v1.5 | 时间流，类似朋友圈 |
| `/life` | 人生清单总览 | v2 | 四类入口 + 统计 |
| `/life/movies` `/life/books` `/life/games` `/life/places` | 分类列表 | v2 | 卡片墙，封面为主 |
| `/life/[type]/[id]` | 条目详情 | v2 | 你的评价、评分、访客短评 |
| `/gallery` | 摄影画廊 | v2.5 | |
| `/gallery/[category]` | 分类画廊 | v2.5 | landscape / portrait / documentary |
| `/gallery/[id]` | 单张作品 | v2.5 | 大图 + EXIF + 拍摄故事 |
| `/whisper` | 悄悄话投递 | v2.5 | |
| `/login` | 登录 | v1.5 | |
| `/api/*` | 接口 | v1 | |
| `/rss.xml` `/sitemap.xml` | 订阅与索引 | v1.5 | |

**URL 一旦发布不再更改。** 改了外链和搜索引擎收录会全断。这条是硬规则。

### 3.2 「树洞」入口设计

不是把入口做得让人找不到，而是**让它不打扰 P1 访客，但对好奇的人有吸引力**。

- 位置：个人主页页脚，一个不起眼的小符号（候选：一个句点、一个小月亮、一个可点击的标点）。不带文字说明。
- 反馈：鼠标悬停或长按时有细微反应（呼吸、微微发亮），暗示「这里可以点」。
- 转场：点击后有一段 600–900ms 的整页转场（候选：颜色反转、整页向上推移、光线扩散）。转场是「进入另一个世界」的仪式，不能是普通跳转。
- 落点：进入 `/moments`（v1 阶段先落到 `/blog`）。进入后视觉语言完全换一套：主页是克制冷静的，里层是放开的。
- 里层有一个明确的「回到正式主页」的出口，且同样低调。
- 键盘可达（Tab 能选中、Enter 能触发），有 aria-label，供屏幕阅读器识别。

---

## 4. 功能需求

编号规则：`FR-模块-序号`。每条含验收标准（AC），实现完成后逐条勾验。

### 4.1 个人主页（FR-HOME）

| 编号 | 需求 | 版本 | 验收标准 |
|---|---|---|---|
| FR-HOME-01 | 首屏展示姓名、一句话身份、联系方式入口 | v1 | 手机竖屏首屏内可见，无需滚动 |
| FR-HOME-02 | 教育经历（UCL BSc CS） | v1 | 含学校、学位、时间、可选 GPA/课程亮点 |
| FR-HOME-03 | 项目 / 经历列表 | v1 | 每项含标题、时间、技术栈、一句话成果、外链 |
| FR-HOME-04 | 技能清单，按类别分组 | v1 | 不用进度条百分比（业界普遍认为不专业） |
| FR-HOME-05 | 联系方式与外链 | v1 | Email、GitHub、LinkedIn，可选 CV 下载 |
| FR-HOME-06 | 最近文章（拉取 3 篇） | v1 | 表明这个人在持续输出 |
| FR-HOME-07 | 树洞入口 | v1 | 见 3.2 |
| FR-HOME-08 | 主页内容可在后台编辑 | v1.5 | v1 阶段允许硬编码在代码里 |
| FR-HOME-09 | 中英双语切换 | v2 | 待定，见第 8 节 |

**设计约束**：这一页是给 30 秒内做判断的人看的。信息密度高、层级清晰、零花哨。不放大幅背景动画，不放自动播放视频。

### 4.2 技术博客（FR-BLOG）

| 编号 | 需求 | 版本 | 验收标准 |
|---|---|---|---|
| FR-BLOG-01 | 文章列表，倒序，分页 | v1 | 每页 10 篇，含标题、摘要、日期、标签、阅读时长 |
| FR-BLOG-02 | 文章详情页 | v1 | Markdown 正确渲染，中文排版舒适（行高 1.75+，字号 17–18px） |
| FR-BLOG-03 | 代码高亮 | v1 | 支持你常用语言（Python / TS / Java / C / Go），含语言标签与复制按钮 |
| FR-BLOG-04 | 标签系统与标签归档页 | v1 | 一篇多标签 |
| FR-BLOG-05 | 目录（TOC） | v1 | 桌面端侧边固定，滚动高亮当前章节；手机端折叠 |
| FR-BLOG-06 | 草稿 / 已发布状态 | v1 | 草稿不出现在公开列表，但可通过预览链接查看 |
| FR-BLOG-07 | 图片支持 | v1 | 懒加载、指定宽高防跳动、点击可放大 |
| FR-BLOG-08 | 数学公式 | v1.5 | KaTeX |
| FR-BLOG-09 | 全文搜索 | v2 | 先用客户端搜索，文章过百再考虑服务端 |
| FR-BLOG-10 | 系列文章 | v2 | 同一系列内可上一篇/下一篇 |
| FR-BLOG-11 | 评论 | v1.5 | 见 4.6 |
| FR-BLOG-12 | RSS 输出 | v1.5 | |

### 4.3 碎碎念（FR-MOMENT）

| 编号 | 需求 | 版本 | 验收标准 |
|---|---|---|---|
| FR-MOMENT-01 | 时间流展示，倒序 | v1.5 | 无标题，纯正文 + 图 + 时间 |
| FR-MOMENT-02 | 一条可含 0–9 张图 | v1.5 | 网格排布，点击进入全屏轮播 |
| FR-MOMENT-03 | 支持简单 Markdown（加粗、链接、换行） | v1.5 | 不需要标题、代码块 |
| FR-MOMENT-04 | 可选地点与心情标记 | v1.5 | 纯文本，不接地图 API |
| FR-MOMENT-05 | 手机端快速发布 | v1.5 | 从打开后台到发出，≤5 步操作 |
| FR-MOMENT-06 | 无限滚动加载 | v1.5 | |
| FR-MOMENT-07 | 评论 | v1.5 | |

### 4.4 人生清单（FR-LIFE）

四类条目（电影、书、游戏、旅行地点）共用一套数据结构和一套组件，靠 `type` 字段区分。这是本项目最重要的一个抽象决定。

| 编号 | 需求 | 版本 | 验收标准 |
|---|---|---|---|
| FR-LIFE-01 | 卡片墙列表，封面为主视觉 | v2 | 封面缺失时有统一的占位设计，不能崩掉版式 |
| FR-LIFE-02 | 状态区分：已完成 / 进行中 / 想做 | v2 | 可切换筛选；「想做」是待办清单的核心 |
| FR-LIFE-03 | 条目详情页 | v2 | 封面、基本信息、你的评分、你的长评、完成日期 |
| FR-LIFE-04 | 评分制度 | v2 | 采用 5 星、支持半星（决策见第 8 节） |
| FR-LIFE-05 | 一句话短评 + 长评分离 | v2 | 短评在卡片上显示，长评在详情页 |
| FR-LIFE-06 | 排序与筛选 | v2 | 按评分、按完成时间、按年份、按标签 |
| FR-LIFE-07 | 统计概览 | v2 | 今年看了 N 部、读了 N 本、平均分、评分分布 |
| FR-LIFE-08 | 封面与元信息自动抓取 | v2 | 后台输入片名/书名 → 自动带出封面、年份、导演/作者 |
| FR-LIFE-09 | 旅行条目的额外字段 | v2 | 国家、城市、去过的日期、关联照片 |
| FR-LIFE-10 | 旅行地图视图 | v2.5 | 去过的地方在地图上点亮 |
| FR-LIFE-11 | 访客登录后可留下自己的评分与短评 | v2 | 见 4.6 |

**数据来源**：电影用 TMDB API，书用 Google Books 或 Open Library，游戏用 IGDB（需 Twitch 账号），旅行地点封面用你自己的照片。豆瓣没有公开 API，不作为数据源。抓到的封面必须**下载并存到自己的存储**，不能直接外链（外链会失效，且大陆访问不稳）。

### 4.5 摄影画廊（FR-GALLERY）

| 编号 | 需求 | 版本 | 验收标准 |
|---|---|---|---|
| FR-GALLERY-01 | 分类：风景 / 人像 / 纪实 | v2.5 | 分类可扩展 |
| FR-GALLERY-02 | 瀑布流或网格布局，保持原始比例 | v2.5 | 加载时不跳动 |
| FR-GALLERY-03 | 渐进式加载（模糊占位 → 清晰） | v2.5 | 用 blurhash 或 LQIP |
| FR-GALLERY-04 | 全屏大图查看，支持键盘和手势翻页 | v2.5 | |
| FR-GALLERY-05 | 显示 EXIF | v2.5 | 相机、镜头、光圈、快门、ISO、焦距、拍摄日期 |
| FR-GALLERY-06 | 每张可写拍摄故事 | v2.5 | 可选，不写则不显示 |
| FR-GALLERY-07 | 相册 / 组图 | v2.5 | 一次旅行的照片可成组 |
| FR-GALLERY-08 | 多尺寸响应式输出 | v2.5 | 手机不下载 4000px 原图，这是性能生死线 |
| FR-GALLERY-09 | 右键保护与水印 | v2.5 | 待定，见第 8 节 |

### 4.6 账号与互动（FR-AUTH / FR-SOCIAL）

| 编号 | 需求 | 版本 | 验收标准 |
|---|---|---|---|
| FR-AUTH-01 | 邮箱验证码登录（6 位数字） | v1.5 | 主要方式，大陆友好，见 6.1 |
| FR-AUTH-02 | GitHub 登录 | v1.5 | 面向技术圈访客 |
| FR-AUTH-03 | Google 登录 | v2 | 可选项，界面上标注可能需要网络条件 |
| FR-AUTH-04 | 你自己的管理员身份 | v1 | `role = owner`，唯一能进后台的人 |
| FR-AUTH-05 | 会话保持与登出 | v1.5 | 会话 30 天 |
| FR-AUTH-06 | 用户可删除自己的账号与数据 | v1.5 | GDPR 要求，见 6.5 |
| FR-SOCIAL-01 | 评论：登录后可对文章 / 碎碎念 / 条目 / 照片留言 | v1.5 | 多态设计，一套代码 |
| FR-SOCIAL-02 | 楼中楼回复（一层） | v1.5 | 不做无限嵌套 |
| FR-SOCIAL-03 | 你可以删除、隐藏任何评论 | v1.5 | 后台一键操作 |
| FR-SOCIAL-04 | 新评论通知你 | v1.5 | 邮件或后台红点 |
| FR-SOCIAL-05 | 访客对清单条目打分 + 写短评 | v2 | 与你自己的评分分开展示，条目页显示「你 4.5 · 访客均分 4.1（7 人）」 |
| FR-SOCIAL-06 | 悄悄话：访客给你发只有你能看的留言 | v2.5 | 支持匿名（不登录也能发），但要有防刷 |
| FR-SOCIAL-07 | 订阅更新：新文章邮件通知 | v2.5 | 含一键退订链接 |
| FR-SOCIAL-08 | 未登录访客可浏览全部公开内容 | v1 | 登录只影响「能不能留下东西」，不影响「能不能看」 |
| FR-SOCIAL-09 | 反垃圾：频率限制 + 敏感词 + 人工审核开关 | v1.5 | 见 6.4 |

### 4.7 管理后台（FR-ADMIN）· 移动优先

这是本项目和普通静态博客最大的区别，也是 v1 的核心工作量。**所有界面从 375px 宽度开始设计。**

| 编号 | 需求 | 版本 | 验收标准 |
|---|---|---|---|
| FR-ADMIN-01 | 后台登录与鉴权 | v1 | 非 owner 访问 `/admin/*` 一律 404 |
| FR-ADMIN-02 | 文章列表：草稿 / 已发布分组 | v1 | 手机上单手可操作 |
| FR-ADMIN-03 | 编辑器：Markdown 输入 + 实时预览切换 | v1 | 手机上键盘弹出后编辑区不被遮挡（这是移动端最常见的坑） |
| FR-ADMIN-04 | 自动保存草稿 | v1 | 每 10 秒或失焦时保存，绝不能丢内容 |
| FR-ADMIN-05 | 图片上传：从相册选、拍照、粘贴 | v1 | 上传后自动插入 Markdown 图片语法 |
| FR-ADMIN-06 | 上传时自动压缩与格式转换 | v1 | 转 WebP/AVIF，长边限制，去除 GPS 信息 |
| FR-ADMIN-07 | 发布 / 撤回 / 定时发布 | v1 | 定时发布可放 v1.5 |
| FR-ADMIN-08 | 图片库管理 | v1 | 查看已上传、复制链接、删除 |
| FR-ADMIN-09 | 移动端工具条：常用 Markdown 语法一键插入 | v1 | 手机上打 `#` `**` `[]()` 很痛苦，必须有快捷按钮 |
| FR-ADMIN-10 | 离线容错 | v1.5 | 网络中断时内容存在本地，恢复后继续 |
| FR-ADMIN-11 | 碎碎念快速发布界面 | v1.5 | 独立于文章编辑器，更轻 |
| FR-ADMIN-12 | 清单条目录入（含自动抓封面） | v2 | |
| FR-ADMIN-13 | 照片批量上传与 EXIF 自动读取 | v2.5 | |
| FR-ADMIN-14 | 评论与悄悄话管理 | v1.5 | |
| FR-ADMIN-15 | 可安装为 PWA（加到主屏幕） | v1.5 | 手机上像个 App，省去每次输网址 |

---

## 5. 数据模型（初稿）

用 Prisma 语法表达，便于直接落地。字段可增，但**表之间的关系一旦定下来，改动成本很高**，请重点看关系设计。

三个核心抽象决定：

1. **四类清单条目共用一张 `Item` 表**，靠 `type` 区分，类型特有字段放 `meta` JSON。避免写四套几乎一样的代码。
2. **评论用多态设计**（`targetType` + `targetId`），一套评论逻辑服务文章、碎碎念、条目、照片。
3. **所有图片走统一的 `Media` 表**，业务表只存 Media 的 id。这样压缩、CDN、删除清理都只需处理一处。

```prisma
// ---------- 用户与权限 ----------
model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  name          String?
  avatarUrl     String?
  role          Role      @default(VISITOR)   // OWNER | VISITOR
  createdAt     DateTime  @default(now())
  lastSeenAt    DateTime?
  accounts      Account[]      // Auth.js: 第三方登录绑定
  sessions      Session[]
  comments      Comment[]
  itemRatings   ItemRating[]
  whispers      Whisper[]
  subscription  Subscription?
}

enum Role { OWNER VISITOR }

// ---------- 统一媒体资产 ----------
model Media {
  id         String   @id @default(cuid())
  storageKey String   @unique          // 对象存储里的 key
  url        String                    // 公开访问 URL（自有域名）
  mimeType   String
  width      Int
  height     Int
  sizeBytes  Int
  blurhash   String?                   // 模糊占位图，防止加载跳动
  alt        String?
  exif       Json?                     // 摄影作品用
  createdAt  DateTime @default(now())
}

// ---------- 技术博客 ----------
model Post {
  id          String     @id @default(cuid())
  slug        String     @unique
  title       String
  summary     String?
  content     String                    // Markdown / MDX 源码
  coverId     String?
  cover       Media?     @relation(fields: [coverId], references: [id])
  status      PubStatus  @default(DRAFT)
  visibility  Visibility @default(PUBLIC)   // 预留，v1 恒为 PUBLIC
  publishedAt DateTime?
  updatedAt   DateTime   @updatedAt
  createdAt   DateTime   @default(now())
  readingMin  Int?
  seriesId    String?
  tags        Tag[]      @relation("PostTags")
  viewCount   Int        @default(0)
}

enum PubStatus  { DRAFT SCHEDULED PUBLISHED ARCHIVED }
enum Visibility { PUBLIC MEMBER FRIEND PRIVATE }   // v1 只用 PUBLIC / PRIVATE

// ---------- 碎碎念 ----------
model Moment {
  id         String     @id @default(cuid())
  content    String                       // 短文本，轻 Markdown
  images     Media[]    @relation("MomentImages")
  place      String?                      // 纯文本地点，不接地图 API
  mood       String?
  visibility Visibility @default(PUBLIC)
  createdAt  DateTime   @default(now())
}

// ---------- 人生清单（四类共用） ----------
model Item {
  id            String     @id @default(cuid())
  type          ItemType                    // MOVIE | BOOK | GAME | PLACE
  title         String
  originalTitle String?
  year          Int?
  creator       String?                     // 导演 / 作者 / 开发商 / 国家
  coverId       String?
  cover         Media?     @relation(fields: [coverId], references: [id])
  externalId    String?                     // TMDB / IGDB / OpenLibrary 的 id
  externalUrl   String?
  status        ItemStatus @default(WISHLIST)  // DONE | DOING | WISHLIST
  myRating      Float?                      // 0.5–5.0，半星步进
  myShort       String?                     // 一句话短评，显示在卡片上
  myReview      String?                     // 长评，Markdown，显示在详情页
  startedAt     DateTime?
  finishedAt    DateTime?
  meta          Json?                       // 类型特有：时长/页数/平台/经纬度…
  tags          Tag[]      @relation("ItemTags")
  photos        Media[]    @relation("ItemPhotos")   // 旅行地点关联自己的照片
  visitorRatings ItemRating[]
  visibility    Visibility @default(PUBLIC)
  sortWeight    Int        @default(0)
  createdAt     DateTime   @default(now())
}

enum ItemType   { MOVIE BOOK GAME PLACE }
enum ItemStatus { DONE DOING WISHLIST }

// 访客对条目的评分与短评（与你自己的评分分开存）
model ItemRating {
  id        String   @id @default(cuid())
  itemId    String
  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  score     Float
  comment   String?
  createdAt DateTime @default(now())
  @@unique([itemId, userId])   // 一人一条目只能评一次，可修改
}

// ---------- 摄影 ----------
model Photo {
  id         String   @id @default(cuid())
  mediaId    String   @unique
  media      Media    @relation(fields: [mediaId], references: [id])
  title      String?
  story      String?                    // 拍摄故事，可空
  category   PhotoCat                   // LANDSCAPE | PORTRAIT | DOCUMENTARY
  albumId    String?
  album      Album?   @relation(fields: [albumId], references: [id])
  shotAt     DateTime?
  place      String?
  featured   Boolean  @default(false)
  sortWeight Int      @default(0)
}

enum PhotoCat { LANDSCAPE PORTRAIT DOCUMENTARY STREET OTHER }

model Album {
  id       String  @id @default(cuid())
  slug     String  @unique
  title    String
  intro    String?
  coverId  String?
  photos   Photo[]
}

// ---------- 互动 ----------
model Comment {
  id         String        @id @default(cuid())
  targetType CommentTarget                 // POST | MOMENT | ITEM | PHOTO
  targetId   String                        // 多态：不做外键，用应用层保证
  userId     String
  user       User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  parentId   String?                       // 楼中楼，仅一层
  content    String
  status     CommentStatus @default(VISIBLE)  // VISIBLE | HIDDEN | PENDING
  createdAt  DateTime      @default(now())
  @@index([targetType, targetId])
}

enum CommentTarget { POST MOMENT ITEM PHOTO }
enum CommentStatus { VISIBLE HIDDEN PENDING }

model Whisper {                             // 悄悄话，单向，只有你能看
  id        String   @id @default(cuid())
  userId    String?                         // 允许匿名
  user      User?    @relation(fields: [userId], references: [id])
  content   String
  contact   String?                         // 匿名者可留联系方式
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Subscription {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  byEmail   Boolean  @default(true)
  token     String   @unique                // 一键退订用
  createdAt DateTime @default(now())
}

model Tag {
  id      String   @id @default(cuid())
  slug    String   @unique
  name    String
  posts   Post[]   @relation("PostTags")
  items   Item[]   @relation("ItemTags")
}
```

**待确认的建模问题**：重复体验（一本书读两遍、一个地方去两次）目前用单条记录 + 单个 `finishedAt` 表示，无法记录多次。如果你觉得重要，需要拆出一张 `ItemLog` 表。见第 8 节。

---

## 6. 非功能需求

### 6.1 中国大陆可访问性（硬约束）

这一节的每一条都是**否决性规则**，违反任何一条都会导致大陆访客打不开或登不上你的网站。

| 编号 | 规则 | 原因 |
|---|---|---|
| NFR-CN-01 | **禁止**引用 Google Fonts、`fonts.googleapis.com`、`fonts.gstatic.com` | 大陆无法访问，浏览器会阻塞等待，首屏卡住十几秒甚至白屏。字体必须自托管，且中文字体必须做子集化（否则单个字体文件动辄 10MB+） |
| NFR-CN-02 | **禁止**使用 Google Analytics、Google reCAPTCHA、Google Tag Manager | 同上，且会拖慢全站 |
| NFR-CN-03 | Google 登录**不能是唯一或默认**登录方式 | 大陆访客点了会卡死。放在次要位置并加提示 |
| NFR-CN-04 | 主登录方式为**邮箱 6 位验证码**，不用「魔法链接」 | 国内邮箱（QQ / 163）常会改写或拦截邮件中的外部链接，验证码更可靠。同时需配置 SPF / DKIM / DMARC 提高送达率，并在界面提示「请检查垃圾邮件」 |
| NFR-CN-05 | 必须使用**自有域名**，不能让访客访问 `*.vercel.app` | 该域名在大陆被污染 |
| NFR-CN-06 | 图片 CDN 必须绑自有域名，不用 `*.r2.dev` 等默认域名 | 同上 |
| NFR-CN-07 | 所有第三方脚本上线前必须逐个确认大陆可达 | 评论、分析、地图、字体、表情包，任何一个都可能是地雷 |
| NFR-CN-08 | 首屏渲染不依赖任何第三方资源 | 即使某个第三方挂了，页面主体也要能显示 |
| NFR-CN-09 | 不做 ICP 备案，接受大陆访问速度较慢（预计首屏 2–5 秒） | 备案需国内主体、身份证与国内地址，且个人备案通常不允许交互式内容（评论、用户系统），与本项目需求直接冲突 |
| NFR-CN-10 | 上线前必须由大陆的朋友实测一次完整流程：打开 → 浏览 → 注册 → 登录 → 评论 | 这是唯一可靠的验证方式 |

**部署地域建议**：Vercel 选香港或新加坡区（对大陆延迟最低，同时对英国也可接受）。数据库选新加坡区并与部署区一致，避免跨区查询把延迟翻倍。

### 6.2 性能

- 首屏 LCP：英国 < 1.5s，大陆 < 5s。
- Lighthouse 性能分 ≥ 90（桌面）、≥ 80（移动）。
- 图片必须多尺寸输出 + 懒加载 + 指定宽高，禁止直接输出原图。
- 单页 JS 首次加载 < 200KB（gzip 后）。

### 6.3 响应式与兼容

- 断点：375 / 768 / 1024 / 1440。
- 后台从 375px 开始设计，不是「桌面版缩小」。
- 支持最近两个大版本的 Chrome / Safari / Edge / Firefox，含 iOS Safari。
- 触控目标最小 44×44px。

### 6.4 安全与反垃圾

- 后台路由服务端强制鉴权，不能只靠前端隐藏。
- 所有用户提交内容渲染前必须转义 / 净化，防 XSS。
- 评论、悄悄话、验证码发送均设频率限制（例：同 IP 每分钟 3 次）。
- 图片上传校验真实类型与大小上限，去除 GPS EXIF。
- 敏感操作走 CSRF 保护。
- 秘钥一律走环境变量，绝不进仓库。

### 6.5 隐私与合规（你在英国，GDPR 适用）

- 需要一个 `/privacy` 页面，说明收集了什么、为什么、存多久、怎么删。
- 用户可自助删除账号及其全部数据。
- 分析工具选不使用 Cookie 的方案（如 Umami），可免 Cookie 横幅。
- 摄影作品中若有可识别人像，注意肖像使用许可。

### 6.6 成本预算

目标 **每年 £15–30**，主要是域名钱。

| 项 | 方案 | 成本 |
|---|---|---|
| 域名 | Cloudflare Registrar / Namecheap | £10–15 / 年 |
| 部署 | Vercel Hobby | 免费（个人非商业） |
| 数据库 | Neon 免费额度 | 免费（0.5GB） |
| 图片存储 | Cloudflare R2 | 10GB 内免费，无出口流量费 |
| 邮件 | Resend 免费额度 | 3000 封 / 月免费 |
| 分析 | Umami Cloud / Vercel Analytics | 免费额度 |

**注意**：摄影作品多了以后存储会超免费额度，R2 超出后约 $0.015/GB/月，可控。

---

## 7. 技术锚定（初步）

| 层 | 选型 | 版本 | 理由 |
|---|---|---|---|
| 框架 | Next.js（App Router） | 15.x | 前后端一体，一个项目同时解决页面、接口、后台。生态最大，招聘认可度最高 |
| 语言 | TypeScript（strict） | 5.x | 你已熟悉；类型是大型项目不失控的关键 |
| 样式 | Tailwind CSS | v4 | 快、约束性强，配合设计 token 保证一致性 |
| 组件基座 | shadcn/ui + Radix | — | 代码进你自己仓库，可完全改造外观，不会有「模板味」 |
| 数据库 | PostgreSQL @ Neon | — | 关系型、有免费额度、serverless 适合 Vercel |
| ORM | Prisma | 6.x | 对新手最友好，schema 即文档，迁移工具完善 |
| 认证 | Auth.js (NextAuth) | v5 | 多种登录方式一次配好，会话与安全细节不用自己造 |
| 对象存储 | Cloudflare R2 | — | 无出口流量费，可绑自有域名（NFR-CN-06） |
| 图片处理 | sharp + next/image | — | 上传时转 WebP、生成多尺寸与 blurhash |
| 编辑器 | 待定，见第 8 节 | — | v1 的关键选型 |
| Markdown 渲染 | remark / rehype + Shiki | — | Shiki 做代码高亮，构建期生成，零客户端开销 |
| 邮件 | Resend | — | 发验证码与通知 |
| 部署 | Vercel（香港/新加坡区） | — | 推代码自动上线；注意 NFR-CN-05 |
| 分析 | Umami Cloud | — | 无 Cookie，免合规横幅 |
| 代码质量 | ESLint + Prettier + Husky | — | 提交前自动检查 |
| CI | GitHub Actions | — | PR 自动跑 lint 与 build |
| 动效 | Motion (原 Framer Motion) | — | 树洞转场、页面过渡 |

**仓库与协作流程**：以根目录 `CONTRIBUTING.md` 为准，AI 特有规则见 `AGENTS.md`。

---

## 8. 待决问题（Open Questions）

编号 OQ，每个都需要在对应版本开工前敲定。

| 编号 | 问题 | 影响 | 需在何时定 |
|---|---|---|---|
| OQ-01 | 域名叫什么？（建议围绕 Luan / 你的英文名，`.com` 优先，`.dev` 次之） | 全站、邮件、SEO | v1 开工前 |
| OQ-02 | 视觉风格方向？需要单独一轮讨论（参考站、配色气质、字体、动效强度） | 全部设计工作 | v1 设计阶段 |
| OQ-03 | 后台编辑器：Markdown 源码 + 预览，还是所见即所得富文本？前者对技术博客更合适，后者手机上更舒服 | FR-ADMIN-03，v1 核心 | v1 开工前 |
| OQ-04 | 评分制度：5 星半星 / 10 分制 / 不打分只写感受 | FR-LIFE-04 数据类型 | v2 前 |
| OQ-05 | 是否需要中英双语？做双语会让内容量翻倍 | FR-HOME-09，架构层面 | v1 开工前（架构相关，晚了难加） |
| OQ-06 | 是否需要记录「重复体验」（重读、重玩、多次去同一地方） | 数据模型是否拆 ItemLog 表 | v2 前 |
| OQ-07 | 摄影作品是否加水印 / 防右键？防不住真想偷的人，但会影响观感 | FR-GALLERY-09 | v2.5 前 |
| OQ-08 | 简历 PDF 是否公开下载？（含联系方式的隐私考虑） | FR-HOME-05 | v1 前 |
| OQ-09 | 现有内容盘点：你手上实际有多少篇技术笔记、多少条影/书/游戏记录、多少张成片？ | 决定是否需要写批量导入脚本 | v1 期间 |
| OQ-10 | 悄悄话是否允许完全匿名？允许则更容易收到真话，也更容易被骚扰 | FR-SOCIAL-06 | v2.5 前 |

---

## 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-08-29 | v0.1 | 首次起草。确定全栈自建路线、四个版本划分、数据模型初稿、大陆可访问性硬约束 |
| 2026-08-29 | v0.2 | 新增 1.5 学习目标与设计原则第 6 条；架构与工程规范拆分至 `02-architecture.md`；建立 `adr/` 决策记录与 `tech-debt.md` |
| 2026-08-30 | v0.3 | Removed section 1.5 (learning goals) and the related success criterion. Project docs track product and engineering decisions only. |
