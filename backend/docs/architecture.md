# Pivott 架构（与 demo 对齐）

> 数据模型和接口分别以 [data-model.md](data-model.md) 和 [api-design.md](api-design.md) 为准。
> 后端已按这两份文档迁移：12 张目录/信号表 + `meta`、43 个测试、Aisyah 62% / 76.4% 黄金用例均已通过。第 9 节是当前状态。
> `live` 由 `app/live/` 从 O*NET 31.0 + Arbeitnow 构建，不写 demo 种子；见 [live-data.md](live-data.md)。
>
> demo 与 live 是两套数据库、两套部署：`PIVOTT_DATASET=demo|live` 选择数据集，库里的 `meta.dataset` 做防呆校验，demo 种子不会写进 live 库。

## 1. 目标与非目标

Pivott 回答四个问题：

1. 这个岗位里**哪些任务**会被 AI 影响（`exposure` 0–1）？
2. 按时长加权后，这个岗位的整体暴露度是多少（`roleExposure`）？
3. 哪些**相邻岗位**能复用现有技能（`fit` / `score` / `gaps`）？
4. 从当前水平到目标岗位，**最短可信的学习路径**是什么（周计划）？

非目标：

- 不训练或微调 LLM；所有分数是确定性公式。
- 不实时爬取招聘网站或新闻。
- 不做账号体系、支付、真实招聘对接。
- 不输出“失业概率”；`roleExposure` 只是时长加权暴露度。

## 2. 组件

| 组件 | 现状 | 说明 |
|---|---|---|
| 前端 | Next.js 16 App Router + React 19 + TypeScript | 6 个主页面 + landing + example + passport + styleguide |
| 页面内计算 | `lib/engine.ts` 在浏览器直接算分 | 保留，作为离线/demo 模式 |
| HTTP 层 | Next Route Handlers + FastAPI | 两套实现同一 JSON 契约 |
| API 服务 | FastAPI + SQLModel（本仓库） | 已按 [api-design.md](api-design.md) 实现 |
| 登录 | Supabase Auth + JWKS 校验 | 密码/会话由 Supabase 管理；FastAPI 只验证 access token |
| 数据库 | demo：本地 SQLite `pivott.db` 或专用 Supabase；live：独立 Postgres | `PIVOTT_DATASET` 选数据集；未登录 profile 在 localStorage，登录用户存 `profiles` |
| 评分引擎 | Python 复刻 TS `lib/engine.ts` | Aisyah 62% / 76.4% 与前端一致 |

```text
┌──────────────────────────────┐        ┌──────────────────────┐
│ Browser (Next.js 16)         │        │ Supabase Auth        │
│  6 pages + landing + example │◀──────▶│ sign-in / JWT        │
│  localStorage: profile       │        └──────────┬───────────┘
│  lib/engine.ts: 本地算分      │                   │ access token
└──────────────┬───────────────┘                   │
               │ 同一 JSON 契约（任选其一）         │
               ├──────────────────────────────┐    │
               ▼                              ▼    ▼
┌──────────────────────────────┐   ┌──────────────────────────┐
│ Next Route Handlers          │   │ FastAPI (this repo)      │
│ app/api/*  (demo 默认这层)    │   │ app/main.py + JWKS 校验  │
└──────────────────────────────┘   └────────────┬─────────────┘
                                                │ 可选
                                                ▼
                                     ┌──────────────────────┐
                                     │ SQLite / Supabase    │
                                     │ 只读目录 + 信号       │
                                     │ + 登录用户 profiles   │
                                     └──────────────────────┘
```

**关键原则**：demo 不依赖数据库也能跑；数据库只存目录、信号和登录用户的 profile，不在 SQL 里算分。

## 3. 一次分析请求

```text
POST /api/analysis  { ProfileInput }
  │
  ├─ 1. 校验 roleId；过滤未知 task/skill
  ├─ 2. selections 归一化为时间占比
  ├─ 3. 读 seed tasks + 20 条 signals（+ 已应用用户信号）
  ├─ 4. 每个 task：recency → signal_adjustment → exposure → classification
  ├─ 5. 按 share 加权 → roleExposure
  ├─ 6. 对另外 5 个角色：coverage + task_similarity → fit
  ├─ 7. 目标角色默认 share → targetExposure → route score
  └─ 8. 返回 tasks[] + routes[] + confidence（无 envelope）
```

前端把同一份 `ProfileInput` 存进 localStorage；`POST /api/profiles` 只做校验和回显，不落库。登录用户另外通过 `PUT /api/me/profile` 存进 Supabase（见 [auth.md](auth.md)）。

## 4. 数据模型

完整字段、约束、演示档案见 [data-model.md](data-model.md)。摘要：

| 组 | 实体 | 数量 |
|---|---|---:|
| 目录 | Skill / Role / RoleRequirement / Task / TaskSkill | 15 / 6 / 36 / 31 / 73 |
| 在招职位 | JobPosting（仅 live） | 0（demo） |
| 学习 | Resource | 24 |
| 信号 | Signal / SignalTaskImpact / Scenario | 20 / 41 / 2 |
| SDG | SDG / RoleSDG | 4 / 10 |
| 用户（localStorage） | Profile / Selection / SkillLevel / CustomTask / CustomSignal | 1 / ≤20 / 15 / ≤20 / 不限 |
| 用户（登录） | Profile（JSONB 收拢 selections / skills / custom） | 每 auth 用户 1 行 |

> TaskSkill 73 是 31 个任务的技能链接总数；RoleSDG 10 是各角色 SDG 数组长度之和（1+2+2+1+2+2）。

## 5. API 契约

完整端点、请求/响应示例见 [api-design.md](api-design.md)。要点：

- 10 个 demo 方法：health、seed（GET/POST）、profiles、analysis、pathways（POST/GET）、roles/{id}/tasks、signals（GET）、sdgs。
- 2 个演示控制方法：`POST /api/signals`、`POST /api/analysis/recompute`。
- 10 个登录/个人数据方法：`GET /api/auth/config`、`POST /api/auth/signin|signup|refresh|signout|password/reset`、`GET /api/auth/me`、`GET/PUT/DELETE /api/me/profile`。
- 请求体统一为内联 `ProfileInput`，**没有** `profile_id`；登录用户的 id 只来自 access token 的 `sub`。
- 响应**没有** `{data, meta, sources}` 包装；错误只有 `{error}`。
- 路径不落库；`pathway.id` 是 base64url 输入，`GET` 时重算。
- 用户信号写入数据库，但在 `POST /api/analysis` 里默认不应用，直到 `recompute`。

## 6. 评分引擎

TS 版在 `lib/engine.ts`，Python 版迁移时按同一公式实现。权重集中在 `app/config.py`。

| 模块 | 职责 |
|---|---|
| `exposure.py` | `recency`、`signal_adjustment`、`exposure`、`role_exposure`、`classification` |
| `matching.py` | `skill_coverage`、`task_similarity`、`fit`、`gaps`、`route_score` |
| `pathway.py` | gap → resource → 周计划 |
| `catalog.py` | 只读序列化，不算分 |

```text
recency           = 0.5 ^ (age_days / 180)
signal_adjustment = clamp(Σ(strength × direction × recency × impact), −0.2, +0.2)
exposure          = clamp(base_exposure × scenario.multiplier + signal_adjustment, 0, 1)
role_exposure     = Σ(time_share × exposure)
classification    = Automate if exposure ≥ 0.65 and human_judgment < 0.4
                    Protect  if human_judgment ≥ 0.65
                    Augment  otherwise
skill_coverage    = Σ(importance × min(level / required, 1)) / Σ importance
fit               = 100 × (0.8 × coverage + 0.2 × similarity)   # similarity 为空时退回 coverage
gap_priority      = gap × importance × (role_demand / 100)
weeks             = ceil(Σ gap_hours / hours_per_week)
route_score       = 0.7 × fit + 0.3 × 100 × (1 − target_exposure)
```

硬性要求：

- **确定性**：同一输入、同一 seed 版本，结果逐位一致。
- **可解释**：Why sheet 能展示 coverage、similarity、fit、gap priority、weeks、route score 的代入值。
- **可测试**：每个公式有单测；normal/fast 必须改变排名。
- **不调 LLM**：LLM 最多生成解释文案，必须有模板兜底。

## 7. 安全与隐私

- 未登录 demo 不需要账号；profile、进度、自定义信号只存在浏览器 `pivott:v1`。
- 登录由 Supabase Auth 完成；FastAPI 验 access token 的签名、issuer、audience、expiry 和 `role=authenticated`。
- 推荐浏览器直连 Supabase；UI-only 前端可走可选的 `/api/auth/signin` 桥，密码只转发一次、不落库、不记日志，公网需另加限流。
- 浏览器只拿 Supabase URL + anon key；永远拿不到数据库连接串或 service role key。
- 目录表公开只读；`profiles` 开 RLS，4 条 policy 都要求 `auth.uid() = user_id`，`anon` 默认拒绝。
- 后端用 owner 连接（绕过 RLS），但 `/api/me/*` 一律用 token 的 `sub` 过滤；请求体里没有 user id。
- 姓名清洗：去控制字符和 `<>`、折叠空白、最多 80 字符；始终按文本渲染。
- 信号必须标 `evidence`：`verified` / `illustrative` / `user`；前端区分展示。
- 演示数据是合成的；不存真实个人数据。

## 8. 部署

| 部分 | 建议 | 备注 |
|---|---|---|
| Web + route handlers | Vercel / Node | `pnpm build && pnpm start`，无需环境变量 |
| FastAPI（本仓库） | Render / Railway / Fly.io | `uvicorn app.main:app --host 0.0.0.0 --port $PORT`，或用 `Dockerfile` |
| DB（可选） | Supabase Singapore | Session pooler 5432 |
| CI | GitHub Actions | 前端 `pnpm test`；后端 `pytest -q` + seed 冒烟 |

完整步骤见 [deploy.md](deploy.md)。

本地默认 `PIVOTT_DATASET=demo` + `sqlite:///./pivott.db`，不需要环境变量。两套部署的关键变量：

```text
PIVOTT_DATASET=demo|live                      # 选数据集；默认 demo
PIVOTT_DB=sqlite:///./demo.db                 # demo 本地覆盖
PIVOTT_DB=postgresql+psycopg://...            # live 必须显式给（或 DATABASE_URL）
DATABASE_URL=postgresql+psycopg://...         # demo 的 Supabase 连接串
PIVOTT_AUTO_SEED=true                         # demo 空库启动 seed；live 恒 false
ALLOW_DEMO_RESET=true                         # live 恒 403；公开 demo 设为 false
PIVOTT_SEED_VERSION=2026.10.1                 # 无 meta 时的回退
PIVOTT_DATA_AS_OF=2026-10-01                  # 无 meta 时的回退
CORS_ORIGINS=*                                # 逗号分隔的来源列表
SUPABASE_URL=https://<ref>.supabase.co        # 省略时从 DATABASE_URL 推断
SUPABASE_ANON_KEY=<publishable key>           # 交给浏览器；不是 service role key
# SUPABASE_JWT_SECRET=                       # 只有 legacy HS256 项目需要
```

## 9. 当前真实状态

| 项 | 状态 |
|---|---|
| 本文档 | 已按前端 demo 的 seed/engine/route handlers 对齐；新增数据集分离说明 |
| `app/models.py` | 12 张目录/信号表 + `profiles` + `meta`（含 `job_postings`）；`sort_order` / `position` 存展示顺序 |
| `app/schemas.py` | demo 契约：内联 `ProfileInput`、`roleExposure`、`route.score`、无 envelope；health 多一个 `dataset` |
| `app/seed_data.py` | 6 roles / 31 tasks / 15 skills / 36 requirements / 24 resources / 20 signals / 4 SDGs / 2 scenarios |
| `app/seed.py` | demo-only 幂等 seeder；写 `meta.dataset`，拒绝写 live 库；`--reset` 可重置 |
| `app/runtime.py` | 启动时从 `meta` 读 `data_as_of` / `seed_version` / `demoPersona` |
| `app/errors.py` | 统一错误信封：HTTPException / 校验 / ProfileError / DB 503 / 兜底 500；500 中间件位于 CORS 内层 |
| `supabase/schema.sql` | 12 张表 + `meta` + 索引 + RLS 只读策略 |
| `supabase/migrations/202610221915_dataset_separation.sql` | 旧库加 `sort_order` / `position` / `meta` |
| `supabase/migrations/202610231200_profiles.sql` | `profiles` 表 + 4 条 owner RLS policy + `authenticated` grant |
| `scripts/backfill_demo_order.py` | 旧 demo 库回填展示顺序 + meta；只 UPDATE |
| `app/auth.py` | Supabase JWKS（ES256/RS256）校验 + legacy HS256 回退；`get_current_user` |
| `supabase/check_connection.py` | 期望 14 张表，行数 15 / 6 / 4 / 2 / 31 / 36 / 10 / 73 / 20 / 41 / 24 / 0 / 0 / 4 |
| Supabase demo 库 | 全部 migration 已执行（14 表）；`profiles` 的 RLS 和 owner 隔离已在本地 PG 验证 |
| `Dockerfile` | Python 3.12 slim + healthcheck；默认 `PIVOTT_DATASET=demo`、`ALLOW_DEMO_RESET=false` |
| `docs/deploy.md` | demo / live 两套部署；Supabase 与 SQLite 持久卷 |
| `app/live/` | O*NET 解析、线索模型、Arbeitnow/Adzuna demand、live 导入器；10 roles / 60 tasks / 85 postings |
| 测试 | 85 passed：公式单测 + Aisyah 62% / 76.4% + pathway + signals diff + 错误信封/503/CORS + 数据集隔离 + 技能名唯一性 + 18 个 live + 42 个 auth/个人数据/登录桥 |
| README | 已改为 Pivott + demo 契约 + 数据集分离 + Supabase Auth |
| 前端 | 独立仓库；sign-in UI 已完成，尚未接 Supabase JS；本工作区只有被 gitignore 的 `.tools/sdc-hack-push` checkout |

迁移已完成。后续可选工作：

1. 前端接登录：方式 A 加 `@supabase/supabase-js` 直连 Supabase；方式 B 直接调 `/api/auth/signin`。两种方式拿到 token 后都读写 `/api/me/profile`（[auth.md](auth.md)）。
2. 写 live 数据导入器（表结构、`meta` 约定、启动保护已就绪）。
3. 把 `app/config.py` 的评分权重暴露到环境变量（目前是常量）。
4. 可选：把 schema 变更迁到 Alembic；当前靠 `supabase/schema.sql` + 手工 migration。

如果前端切到 FastAPI，只需把 `NEXT_PUBLIC_API_BASE` 指向 `http://127.0.0.1:8000`；字段和错误形状不用改。
