Historical log. Not maintained.

# Pivott 后端：工作包与推进方式

> 更新时间：2026-10-22
> 数据模型与接口以 [`../data-model.md`](../data-model.md)、[`../api-design.md`](../api-design.md) 为准；本文只讲怎么拆、怎么推进，不重复字段细节。
> 范围：Pivott 后端（FastAPI + 可选 Supabase）。前端 demo 是独立仓库。

## 0. 先给结论

1. 工作区里只有**一个后端服务**，不是六个独立产品。
2. 建议拆成 **6 个工作包** 推进，但代码放在 **1 个 GitHub 仓库**。
3. “拆分”拆的是任务和目录，不是仓库；拆成多个仓库会让评分引擎、seed、API 互相 import 不到。
4. 只有“多人分工、各自独立部署”才值得多仓库，见第 4 节。

## 1. 系统长什么样

```text
Next.js demo (browser)  ──可选──▶  FastAPI (Pivott API)  ──可选──▶  Supabase Postgres
        │                                  │
        └── lib/engine.ts 本地算分          └── 确定性评分引擎（纯 Python，不调用 LLM）
```

三条边界：

- **demo 不依赖数据库也能跑**：目录、信号、profile 都可以在浏览器/内存里。
- **评分在 Python 里算**：SQL 只存输入和解释结果，不在数据库里“猜”分数。
- **所有数字可解释**：每个匹配分能拆成 `coverage / similarity / fit / gaps / weeks`，每个结论能追到信号和来源。

后端已按 demo 迁移到 **12 张目录/信号表 + `profiles` + `meta` / 24 个 API 方法 / 85 个测试**；live 数据集由 `python -m app.live sync`
从 O*NET 31.0 + Arbeitnow 构建（见 `docs/live-data.md`）。数据模型和接口见 `docs/data-model.md`、`docs/api-design.md`，状态见第 5 节。

## 2. 六个工作包

| # | 工作包 | 干什么（一句话） | 主要文件 | 对应页面 |
|---|---|---|---|---|
| P0-1 | 数据与目录层 | 6 角色 / 31 任务 / 15 技能 / 20 信号 / 4 SDG / 24 资源，建表并灌入可重复 demo 数据 | `supabase/schema.sql`、`app/models.py`、`app/seed_data.py` | start、skills、signals |
| P0-2 | 评分引擎 | 把暴露度、分类、覆盖度、fit、gap、周数算成可复现的数字 | `app/services/*.py`、`app/config.py` | map、routes、Why sheet |
| P0-3 | API 服务层 | 用稳定契约把数据送给前端（内联 `ProfileInput`，无 envelope） | `app/main.py`、`app/routers/*`、`app/schemas.py` | 全部页面 |
| P1-4 | 路径与资源 | gap → 资源 → 周计划；不落库，按小时重算 | `app/services/pathway.py`、`app/routers/pathways.py` | pathway |
| P1-5 | 信号与演示控制 | 信号时间线、加信号、recompute diff、reset | `app/routers/signals.py`、`app/routers/analysis.py`、`app/seed.py` | signals、评委演示 |
| P1-6 | 质量与交付 | 测试、seed 校验、README、CI、部署说明 | `tests/`、`README.md`、`Dockerfile`、`.github/` | 仓库可信度 |

### P0-1 数据与目录层

**干什么**

- 6 个角色、31 个任务、15 个技能、36 条 role_requirements、24 个学习资源、20 条带日期的信号、4 个 SDG、2 个情景、Aisyah 演示档案。
- 12 张目录/信号表（含 live 的 `job_postings`）；登录用户的 `profiles` 单独一张表，`pathways` 不落库。
- 种子脚本可重复执行，重复跑不插重复行。
- 每条信号带 `evidence`（`verified` / `illustrative` / `user`）。

**完成标准**

- 空库执行一遍 schema + seed，计数 = 6 / 31 / 15 / 20 / 4 / 24。
- 再执行一遍，行数不变。
- Aisyah 的 6 个任务 share 合计 100；所有外键、check 约束能拦住坏数据。

**现状**

- `schema.sql` 已重写为 12 张表 + `meta`；`check_connection.py` 的 `expected` 与行数一致。
- `app/seed_data.py` 已替换为 15 技能、20 信号、4 SDG、24 资源、31 任务。
- `pytest -q` 中的 seed/health 测试覆盖计数与 Aisyah share。

详见 [`issues/P0-1-data-catalog.md`](issues/P0-1-data-catalog.md)。

### P0-2 评分引擎

**干什么**

实现 `docs/data-model.md` 第 7 节的全部公式：recency、signal_adjustment、exposure、role_exposure、classification、coverage、similarity、fit、gap_priority、weeks、route_score。

**完成标准**

- 每个公式有单测，覆盖 0、1、越界、空列表。
- 黄金用例：Aisyah Normal 0.619、Fast 0.764；Normal 第一名 Ops、Fast 第一名 FSA。
- `normal` 和 `fast` 真的改变暴露度和排名，不是只换标签。

**现状**

- Python 引擎已复刻 TS 公式；`tests/test_formulas.py` + `test_api.py` 覆盖。
- 黄金用例：Normal 0.619031、Fast 0.763981；Normal 第一名 Ops、Fast 第一名 FSA。

详见 [`issues/P0-2-scoring-engine.md`](issues/P0-2-scoring-engine.md)。

### P0-3 API 服务层

**干什么**

- 10 个 demo 方法 + 2 个演示控制端点：health、seed、profiles、analysis、pathways、pathways/{id}、roles/{id}/tasks、signals、sdgs；`POST /api/signals`、`POST /api/analysis/recompute`。
- 请求体统一内联 `ProfileInput`；响应没有 `{data, meta, sources}`。
- 请求校验、结构化错误 `{error}`、CORS、OpenAPI 文档。

**完成标准**

- 前端页面所需数据都能从 `/docs` 一次调齐。
- Aisyah 62% / 76.4%、FSA fit 56 / 90 小时 / 15 周与 demo 一致。
- 主流程无 500；未知 role 400，role 不存在 404。

**现状**

- 已实现 12 个 demo/演示控制方法；后续又加了 10 个 auth/个人数据方法（`/api/auth/*`、`/api/me/profile`），共 24 个。
- 契约见 [`../api-design.md`](../api-design.md)；错误统一为 `{error}`。

详见 [`issues/P0-3-api-layer.md`](issues/P0-3-api-layer.md)。

### P1-4 路径与资源

**干什么**

- gap → 资源 → 按周排列的步骤；`POST /api/pathways` 只算不写，`GET /api/pathways/{id}` 重算。
- `free_only` 开关；资源 URL 全部来自 seed，不能编造。
- 进度由前端 `completedSteps` 维护；不建 `pathway_steps.status`。

**完成标准**

- 同一 profile 在 6 / 8 / 12 小时下：15 / 12 / 8 周。
- 资源全部有免费/付费标记；FSA 5 步、90 小时。
- 勾选步骤后进度环和路线动画更新（前端配合）。

详见 [`issues/P1-4-pathway-resources.md`](issues/P1-4-pathway-resources.md)。

### P1-5 信号与演示控制

**干什么**

- 信号时间线：日期、来源、方向、强度、影响的任务。
- `POST /api/signals`：现场加一条 `evidence = "user"` 的信号。
- `POST /api/analysis/recompute`：返回 `before / after / delta / changed`，指出哪些任务变了、变了多少。
- `POST /api/seed`：恢复到 20 条干净 demo 信号。

**为什么重要**

“加一条信号 → 分数立刻变化”是整个演示的高潮，比任何静态图表都有说服力。没有 diff，前端只能猜哪里变了。

**现状**

- 已实现：`GET/POST /api/signals`、`POST /api/analysis/recompute`、`POST /api/seed`。
- 旧 `/api/admin/*` 已删除；diff 返回 `before / after / delta / changed`。

详见 [`issues/P1-5-signals-demo.md`](issues/P1-5-signals-demo.md)。

### P1-6 质量与交付

**干什么**

- pytest：公式单测 + 主流程集成测试。
- 种子校验：数量 6/31/15/20/4/24、外键、URL、share 合计。
- README：what / 文档索引 / demo 数字 / API / 当前状态 / 下一步。
- Dockerfile、GitHub Actions、OpenAPI 导出。
- PostgreSQL 验证：`scripts/verify_pg.py` 在一次性 PG 上跑 schema / seed / migration / RLS / TRUNCATE / API；CI 用 `postgres:17` service 跑同一个脚本。

**完成标准**

- `pytest -q` 全绿。
- 新环境按 README 能跑起来；README 不再写 16 skills / 15 signals / 17 SDGs / 18 resources。
- CI 在 PR 上运行并通过。

详见 [`issues/P1-6-quality-delivery.md`](issues/P1-6-quality-delivery.md)。

## 3. 推荐：1 个后端仓库

```text
pivott-api/
├─ app/
│  ├─ main.py              FastAPI 入口、CORS、lifespan
│  ├─ config.py            评分权重、常量
│  ├─ db.py                SQLite/Supabase 连接
│  ├─ models.py            12 张目录/信号表（+ 可选用户表）
│  ├─ schemas.py           ProfileInput / ScoredTask / RouteResult / Pathway
│  ├─ seed.py              种子入口、reset
│  ├─ seed_data.py         合成数据：6/31/15/20/4/24
│  ├─ services/
│  │  ├─ exposure.py
│  │  ├─ matching.py
│  │  ├─ pathway.py
│  │  ├─ profile.py
│  │  └─ catalog.py
│  └─ routers/
│     ├─ catalog.py
│     ├─ profiles.py
│     ├─ analysis.py
│     ├─ pathways.py
│     ├─ signals.py
│     └─ admin.py            （空，旧端点已删除）
├─ supabase/
│  ├─ schema.sql
│  └─ migrations/
├─ tests/
│  ├─ conftest.py
│  ├─ test_formulas.py
│  └─ test_api.py
├─ scripts/
│  └─ verify_pg.py         一次性 PostgreSQL 验证（schema/seed/migration/API）
├─ docs/                   ← 本目录
├─ .github/workflows/tests.yml
├─ .env.example
├─ .gitignore
├─ requirements.txt
├─ README.md
└─ Dockerfile
```

**为什么一个仓库就够**

- `services/` 依赖 `models.py` 和 `schemas.py`；拆开就要发 Python 包或做 submodule。
- 改一个公式会同时动引擎、测试、API 响应；一个 PR 能看完，评审和回滚都简单。
- 一套 CI、一个部署目标、一个 README，黑客松期间最省时间。

## 4. 如果确实要多个仓库

只在“多人分工、各自独立部署”时这么做。按**可部署边界**拆：

| 仓库 | 拥有什么 | 不拥有什么 | 部署 |
|---|---|---|---|
| `pivott-api` | FastAPI 服务、评分引擎、测试 | 建表 DDL、前端 | Render / Railway / 本机 |
| `pivott-db` | `schema.sql`、`migrations/`、`seed.sql` | 任何 Python 代码 | Supabase SQL Editor / CLI |
| `pivott-web` | Next.js demo 前端 | 评分、数据库连接 | Vercel / Netlify |
| `pivott-docs`（可选） | 题目、证据、SDG 映射、pitch | 运行代码 | GitHub Pages |

四条铁律：

1. 不做跨仓库 Python import。
2. 契约是 OpenAPI；前端从 `/openapi.json` 生成类型。
3. 数据库变更走 migration 文件。
4. 不要用 git submodule 共享代码。

## 5. 当前状态

| 事项 | 状态 |
|---|---|
| 数据模型 | `app/models.py` 12 张表 + `profiles` + `meta`，与 `docs/data-model.md` 一致 |
| API 契约 | 24 个方法（10 demo + 2 live + 2 演示控制 + 10 auth/个人数据/登录桥），与 `docs/api-design.md` 一致 |
| 本地 `.git` | 已初始化，无 remote |
| 后端数据库 | 本地默认 SQLite；Supabase 已连接并 seed，API 可切换 |
| Supabase schema | 已在项目 `hgqspcvuoggnqqxfimpn` 执行全部 migration；14 张表 + 索引 + RLS（12 条目录只读 policy + 4 条 `profiles` owner policy + `meta` 无 policy），seed 后行数校验通过 |
| Supabase API smoke | health 6/31/15/20；Aisyah fast 0.763981；用户信号重启后仍在；reset 返回 403；`/api/auth/config` 推断出项目 URL，伪造 token 经 JWKS 校验后 401 |
| 表数量一致性 | `check_connection.py` 期望 14 张；`role_sdgs` 10 行；`profiles` 0 行（未登录） |
| 部署 | `Dockerfile` + `docs/deploy.md`（Supabase/Postgres 或 SQLite 持久卷） |
| CI | `pytest` + seed 冒烟测试 |
| 技能数量 | 15 个，与 demo 一致 |
| 任务/信号/SDG/资源 | 31 / 20 / 4 / 24，与 demo 一致 |
| API | 24 个方法：10 个 demo + 2 个 live + 2 个演示控制 + 10 个 auth/个人数据/登录桥 |
| 测试 | 85 passed：公式、Aisyah 62% / 76.4%、pathway、signals diff、错误信封/503/CORS、18 个 live、42 个 Supabase Auth / 个人数据 / 登录桥 |
| 前端 | 独立仓库；sign-in UI 已完成，尚未接 Supabase JS；本工作区只有 `.tools/sdc-hack-push` checkout（被 gitignore） |

## 6. 接下来

已完成：数据层、引擎、API、测试、README、schema、Dockerfile、CI 冒烟、部署文档、Supabase Auth + 登录用户 profile。

可选下一步：

1. 前端接登录：方式 A 加 `@supabase/supabase-js` 直连 Supabase；方式 B 直接调 `/api/auth/signin`（当前 UI-only 前端最快）。两种方式都把 Supabase 的 anon key 填进 `.env`，再读写 `/api/me/profile`（[`../auth.md`](../auth.md)）。
2. 前端把 API base 指向 FastAPI，删掉重复的 route handler 逻辑（字段不用改）。
3. Supabase 已完成 schema + seed + 全部 migration；后续结构变更走 `supabase/migrations/`。
4. 可选：把 schema 变更迁到 Alembic；当前靠 `supabase/schema.sql` + 手工 migration。

## 7. 已确认的决定

1. 服务端只持久化登录用户的 profile + 进度 + 自定义信号（`profiles` 一张表，JSONB 收拢 selections/skills/custom），pathway 仍按需重算、不落库。
2. 登录用 Supabase Auth；FastAPI 不存密码。默认推荐浏览器直连；另提供可选的 `/api/auth/signin` 桥给 UI-only 前端（密码只转发一次，不落库）。
3. 未登录 demo 继续可用，不需要账号。
4. 仓库名、公开/私有仍可再定；不影响当前代码。
