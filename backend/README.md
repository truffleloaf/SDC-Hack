# Pivott

## English summary

This directory contains the optional FastAPI service, Python scoring engine, O*NET/Arbeitnow importer and PostgreSQL/Supabase schema. The Vercel site does not require this service: production normally uses the Next.js route handlers and committed catalogue. Deploy FastAPI separately when you need live imports, database-backed APIs or cross-engine verification.

```bash
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
PYTHONPATH=. .venv/bin/python -m uvicorn app.main:app --reload --port 8001
```

Run the test suite with `PYTHONPATH=. .venv/bin/python -m pytest -q`. Use the [backend documentation index](docs/README.md) for architecture, API, authentication, live-data and deployment details. The remainder of this README is the original Chinese operational guide.

> **Don't predict the job. Map the tasks. Route the skills.**

Pivott 把岗位拆成任务，估算 AI 对每个任务的暴露度，再把现有技能路由到更低风险的相邻岗位，并给出按周的学习路径。所有分数都是确定性公式算出来的，不调用 LLM。

- 数据模型：[`docs/data-model.md`](docs/data-model.md)
- API 设计：[`docs/api-design.md`](docs/api-design.md)
- 架构与当前状态：[`docs/architecture.md`](docs/architecture.md)
- 3 分钟演示：[`docs/demo-script.md`](docs/demo-script.md)
- 部署：[`docs/deploy.md`](docs/deploy.md)
- Vercel 前端 + Render 后端：[`docs/deploy-render.md`](docs/deploy-render.md)
- live 真实数据：[`docs/live-data.md`](docs/live-data.md)
- Supabase Auth 与用户数据：[`docs/auth.md`](docs/auth.md)
- 本地 PostgreSQL 验证：[`docs/local-postgres.md`](docs/local-postgres.md)

> 后端已按前端 demo 的 seed/engine/route handlers 迁移：12 张目录/信号表 + `profiles` + `meta`，10 个 demo API 方法 + 2 个 live 方法 + 10 个登录/个人数据方法，85 个测试，Aisyah 的 62% / 76.4% 与页面一致。
> 登录由 Supabase Auth 完成：FastAPI 用 JWKS 校验 access token，`/api/me/profile` 按 `sub` 保存用户数据；不登录的 demo 仍然可用。
> `live` 不再靠手写种子：`python -m app.live sync` 从 O*NET 31.0 和 Arbeitnow 构建真实岗位/任务/需求，规则见 [`docs/live-data.md`](docs/live-data.md)。
> demo 数据和线上真实数据**分库**存放（`PIVOTT_DATASET=demo|live`），demo 种子永远不会写进 live 库。
> 数据模型和接口的细节以 [`docs/data-model.md`](docs/data-model.md)、[`docs/api-design.md`](docs/api-design.md) 为准。

## Demo 数据

| 实体 | 数量 |
|---|---:|
| 角色 | 6 |
| 任务 | 31（Finance Admin 6 个，其余 5 个角色各 5 个） |
| 技能 | 15 |
| 角色技能要求 | 36 |
| 学习资源 | 24（17 免费 / 7 付费） |
| 信号 | 20（8 verified / 12 illustrative） |
| 情景 | 2（normal ×1.0、fast ×1.25） |
| SDG | 4（4 / 8 / 9 / 10） |
| 演示档案 | Aisyah，Finance Admin，6h/周 |

固定元数据：`DATA_AS_OF = 2026-10-01`，`SEED_VERSION = 2026.10.1`。

## Demo 数据与线上真实数据

两套数据分库、分部署，不共享表，也不靠 `where dataset = ...` 过滤：

| | demo | live |
|---|---|---|
| 开关 | `PIVOTT_DATASET=demo`（默认） | `PIVOTT_DATASET=live` |
| 数据库 | SQLite `pivott.db`，或 demo 专用 Supabase 项目 | 独立 PostgreSQL/Supabase 项目；必须显式给 `PIVOTT_DB` 或 `DATABASE_URL` |
| 启动 seed | 空库自动灌入 `seed_data.py` | 永不自动 seed，由 `python -m app.live sync` 写入 |
| `POST /api/seed` | 受 `ALLOW_DEMO_RESET` 控制 | 恒返回 403 |
| 库内标记 | `meta.dataset = demo` | `meta.dataset = live` |

`meta` 表还存 `seed_version`、`data_as_of`、`demo_persona`（仅 demo）。启动时进程会校验 `PIVOTT_DATASET` 与库里的 `meta.dataset`：不一致就拒绝启动；live 进程遇到“有数据但没有标记”的库也拒绝启动。即使环境变量配错，demo 种子也写不进 live 库。

新库建表用 `supabase/schema.sql`（12 张目录/信号表 + `meta`），再按文件名顺序执行 `supabase/migrations/*.sql`。已有 demo 库升级：

```powershell
# 1) 加列 + 建 meta；只改结构，不动数据
#    在 Supabase SQL Editor 执行 supabase/migrations/202610221915_dataset_separation.sql
# 2) 技能名唯一索引；只加索引，不动数据
#    在 Supabase SQL Editor 执行 supabase/migrations/202610221930_skill_name_unique.sql
# 3) 回填 demo 的展示顺序和 meta；只 UPDATE
.\.venv\Scripts\python.exe scripts\backfill_demo_order.py
```

demo 库也可以直接 `python -m app.seed --reset` 清空重灌；live 库没有这条路径。

本地 SQLite 旧库要重建一次（`python -m app.seed --reset`）才会丢掉旧的 `ix_skills_*` / `ix_roles_title` 并创建 `skills_name_key`。不重建也能启动，但本地不会校验技能名唯一。

## 登录与用户数据（Supabase Auth）

- 推荐前端用 `@supabase/supabase-js` 直接完成 sign in，拿到 access token；OAuth、刷新、邮件验证都由 Supabase 处理。
- 如果前端只有 UI、暂时不想加 Supabase JS，也可以调后端桥 `POST /api/auth/signin` / `signup` / `refresh` / `signout`：FastAPI 只把邮箱密码转发给 GoTrue 一次，不落库、不记日志。
- 后端用项目 JWKS 校验 token：`GET /api/auth/config` 给出公开的 URL / anon key，`GET /api/auth/me` 返回当前用户。
- `GET/PUT/DELETE /api/me/profile` 按 token 的 `sub` 读写 `profiles` 表；未登录仍可使用全部目录和计算接口。
- Supabase 需要执行 `supabase/migrations/202610231200_profiles.sql`（表 + 4 条 owner RLS policy）；本地 SQLite 会自动建表。
- `SUPABASE_URL` 未填时会从 `DATABASE_URL` 推断；`SUPABASE_ANON_KEY`（或 `SUPABASE_PUBLISHABLE_KEY`）不填时 `/api/auth/config` 的 `signInEnabled` 为 `false`。
- 进度自检：`python scripts/check_auth.py` 会打印 URL、anon key 是否已填、JWKS 的 alg/kid。
- 端到端冒烟：`python scripts/smoke_auth.py --email you@example.com`（signin → me → profile PUT/GET/DELETE → signout）。
- 完整步骤、前端代码和 RLS 说明见 [`docs/auth.md`](docs/auth.md)。

## 演示链路

1. **Landing** → **See a 30-second example**：进入 Aisyah demo 模式（不改个人档案）。
2. **Start**：Finance Admin，6 个任务，时间占比 30/20/15/15/10/10。
3. **Task Map**：Normal 62%，切 Fast 76%；发票录入 82% → 100%，异常处理 36% → 46%。
4. **Routes**：Fast 下第 1 名是 Finance Systems Analyst（fit 56%，5 个 gap，90 小时）；Normal 下第 1 名是 Operations Coordinator。
5. **Pathway**：90 小时；8h/周 = 12 周，12h/周 = 8 周；可切 free-only、勾步骤、导出 `.ics`。
6. **Signals**：Admin 加一条信号 → Recompute → Invoice 82% → 91%，整体 62% → 65%。
7. **Passport**：导出 PNG/PDF，或复制摘要。

完整数字和话术见 [`docs/demo-script.md`](docs/demo-script.md)。

## Quick start

默认是 demo 数据集 + 本地 SQLite（`pivott.db`）；`.env` 里没有 `DATABASE_URL` 时不需要任何变量：

```powershell
.\.venv\Scripts\python.exe -m app.seed --reset
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

如果 `.env` 里已经配了 `DATABASE_URL`（例如 demo 用的 Supabase），它会覆盖 SQLite 默认值；想强制本地库就显式设 `PIVOTT_DB`：

```powershell
$env:PIVOTT_DB='sqlite:///./pivott.db'
```

打开 <http://127.0.0.1:8000/docs>，先调 `GET /api/health`（应为 `dataset: demo`、6 / 31 / 15 / 20）。

登录是可选的：`GET /api/auth/config` 会返回推断出的 Supabase URL 和 `signInEnabled`；本地纯 SQLite、没有 `SUPABASE_URL` 时 `authEnabled=false`，目录/计算接口仍然可用。要真正登录，在 `.env` 填 `SUPABASE_URL` + `SUPABASE_ANON_KEY`，见 [`docs/auth.md`](docs/auth.md)。

```powershell
.\.venv\Scripts\python.exe -m pytest -q   # 85 passed
```

启动 live 数据集（真实岗位/任务，独立库，不会 seed）：

```powershell
$env:PIVOTT_DATASET='live'
$env:PIVOTT_DB='sqlite:///./pivott-live.db'
.\.venv\Scripts\python.exe -m app.live sync     # 首次：下载 O*NET + 抓在招职位
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8001
```

改完 schema / migration / seed 后，在真实 PostgreSQL 上验证一遍（内嵌 PG，不需要 Docker）：

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt   # 首次
.\.venv\Scripts\python.exe scripts\verify_pg.py                     # 20s，全绿才推 Supabase
```

细节和 Docker / CI 用法见 [`docs/local-postgres.md`](docs/local-postgres.md)。

可选 Docker（镜像默认关闭 demo reset）：

```powershell
docker build -t pivott-api .
docker run --rm -p 8000:8000 -e PIVOTT_DB=sqlite:////data/pivott.db -v pivott-data:/data pivott-api
```

本地要现场重置时加 `-e ALLOW_DEMO_RESET=true`。Supabase、CORS 和多实例说明见 [`docs/deploy.md`](docs/deploy.md)。

可选：把 demo 的 `DATABASE_URL` 指向 Supabase demo 项目。先跑 `supabase/schema.sql`，再 `python -m app.seed`；已有库按上面的升级步骤走。完整步骤见 [`docs/deploy.md`](docs/deploy.md)。

## API（已实现）

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/health` | 健康检查、seed 版本、数量 |
| GET | `/api/seed` | 完整 seed 数据 |
| POST | `/api/seed` | 重置 demo |
| POST | `/api/profiles` | 校验并回显 profile（不落库） |
| POST | `/api/analysis` | 任务地图 + 技能 + 路线 |
| POST | `/api/analysis/recompute` | 应用 pending 信号并返回 diff |
| POST | `/api/pathways` | 生成学习路径（不落库） |
| GET | `/api/pathways/{id}` | 按 id 重算路径 |
| GET | `/api/roles/{id}/tasks` | 某角色的评分任务 |
| GET | `/api/signals` | 信号时间线 + recency |
| POST | `/api/signals` | 新增 `evidence = "user"` 的信号 |
| GET | `/api/sdgs` | 4 个 SDG 及角色映射 |
| GET | `/api/live/status` | live 数据来源、O*NET 版本/许可、demand 方法和计数 |
| GET | `/api/live/jobs` | 支撑 demand 的真实在招职位（可按 roleId 过滤） |
| GET | `/api/auth/config` | 公开的 Supabase URL / anon key / 登录是否可用 |
| POST | `/api/auth/signin` | UI-only 前端登录桥：转发 Supabase 邮箱密码，返回 session |
| POST | `/api/auth/signup` | 注册；邮箱确认开启时返回 `needsEmailConfirmation` |
| POST | `/api/auth/refresh` | 用 refresh token 换新 access token |
| POST | `/api/auth/signout` | 注销（幂等） |
| POST | `/api/auth/password/reset` | 发送重置密码邮件（不暴露邮箱是否存在） |
| GET | `/api/auth/me` | 校验 Bearer token 并返回当前用户 |
| GET | `/api/me/profile` | 当前用户保存的 profile（没有则 404） |
| PUT | `/api/me/profile` | 保存/替换当前用户 profile、进度和自定义信号 |
| DELETE | `/api/me/profile` | 删除当前用户 profile（幂等） |

请求体统一是内联 `ProfileInput`（`roleId` / `selections` / `skills` / `scenario` / `hoursPerWeek` / `freeOnly` / `targetRoleId`），没有 `profile_id`；响应也没有 `{data, meta, sources}` 包装。字段和示例见 [`docs/api-design.md`](docs/api-design.md)。

## 评分公式

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

`role_exposure` 是**时长加权任务暴露度**，不是失业概率。

## 仓库当前状态

| 项 | 状态 |
|---|---|
| `docs/data-model.md` / `docs/api-design.md` | 已按前端 demo 对齐，作为事实来源 |
| `app/models.py` | 12 张目录/信号表 + `profiles` + `meta`（含 `job_postings`）；展示顺序用 `sort_order` / `position`，不依赖 seed 常量 |
| `app/schemas.py` | demo 契约：内联 `ProfileInput`、`roleExposure`、`route.score`、无 envelope；新增 `SavedProfileInput/Response` 和 auth 响应 |
| `app/seed_data.py` | 6 roles / 31 tasks / 15 skills / 36 requirements / 24 resources / 20 signals / 4 SDGs / 2 scenarios |
| `app/seed.py` | demo-only 幂等 seeder；写 `meta.dataset`，拒绝写进 live 库 |
| `app/runtime.py` | 启动时从 `meta` 读取 `data_as_of` / `seed_version` / `demoPersona` |
| `app/` 服务 | FastAPI + SQLModel；`PIVOTT_DATASET=demo` 用本地 SQLite，`live` 必须显式配独立库 |
| `supabase/schema.sql` | 12 张表 + `meta` + 索引 + RLS 只读策略（`job_postings` 为 live 新增） |
| Supabase demo 库 | 已执行全部 migration：14 表、meta 4 行、12 条目录只读 policy + 4 条 `profiles` owner policy；`check_connection.py` 通过 |
| `supabase/migrations/202610231200_profiles.sql` | 登录用户的 `profiles` 表、4 条 owner RLS policy、`authenticated` grant、updated_at trigger |
| `supabase/check_connection.py` | 期望 14 张表，行数与 demo 一致（含 `meta` 4 行、`job_postings` / `profiles` 各 0 行） |
| `scripts/verify_pg.py` | 一次性 PostgreSQL 上验证 schema / seed / 约束 / TRUNCATE / migration / profiles RLS / API |
| `app/auth.py` | Supabase JWKS（ES256/RS256）校验、缓存和 `get_current_user`；legacy HS256 回退 |
| `docs/auth.md` | 登录链路、环境变量、`/api/auth/*` 与 `/api/me/profile`、前端接入、安全清单 |
| `Dockerfile` | Python 3.12 slim、healthcheck；默认 `PIVOTT_DATASET=demo`、`ALLOW_DEMO_RESET=false` |
| `docs/deploy.md` | demo / live 两套部署、Supabase 与 SQLite 卷 |
| CI | `.github/workflows/tests.yml`：`pytest`（内存 SQLite）+ `postgres` job（真实 PG 跑 `verify_pg.py`） |
| `app/live/onet.py` | 下载/缓存/解析 O*NET 31.0 文本库；任务→DWA→GWA→技能官方交叉表 |
| `app/live/scoring.py` | `pivott-onet-cues-v1` 线索模型：base exposure / human judgment，版本写进 `meta` |
| `app/live/jobs.py` | Arbeitnow（免 key）与 Adzuna（可选 key）的 demand 抓取、最长标题匹配 |
| `app/live/importer.py` | 10 个 O*NET 职业 → 10 roles / 60 tasks / 80 requirements / 85 postings，一次事务重建 |
| `job_postings` | live 在招职位样本（demo 为空）：`supabase/migrations/202610230045_job_postings.sql` |
| 测试 | 85 passed：公式 + Aisyah 62% / 76.4% + pathway + signals diff + 错误信封/503/CORS + 数据集隔离 + 技能名唯一性 + 18 个 live + 42 个 auth/个人数据/登录桥 |
| 前端 demo | 独立仓库；sign-in UI 已完成，尚未接 Supabase JS；本工作区只有被 gitignore 的 checkout |

## 下一步

1. 前端接真实登录：加 `@supabase/supabase-js`，从 `GET /api/auth/config` 取 URL/anon key，`signInWithPassword` 后把 access token 放进 `Authorization`，再读写 `/api/me/profile`（[`docs/auth.md`](docs/auth.md) 有完整代码）。
2. 在 Supabase Dashboard 的 **Settings → API Keys** 复制 **Publishable key**（或旧版 anon key），填进 `.env` 的 `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY`；不填时 `signInEnabled=false`。
3. live 增强：把 O*NET Technology Skills（Excel/SAP/SQL 这类工具技能）导入 `skills`；给 live 配一批核实过的信号源；把 exposure 线索模型升级成可替换的 CSV（`--exposure-csv`）。
4. 可选：把 schema 变更迁到 Alembic（当前靠 `supabase/schema.sql` + 手工 migration）。

## 数据免责声明

信号是合成的演示数据：8 条 `verified`、12 条 `illustrative`，每条都有来源和 evidence 标记。角色、任务、技能和资源同样是为 demo 构造的，不代表真实劳动市场统计。这些数据只属于 demo 库。

live 库的岗位、任务、技能、重要度和在招职位来自 O*NET 31.0（CC BY 4.0）和 Arbeitnow；
`base_exposure` / `human_judgment` 是 Pivott 的线索模型（`pivott-onet-cues-v1`），
`demand` 是招聘板快照内的相对热度，两者都不是劳动力市场统计，也不输出“失业概率”。
来源和限制见 [`docs/live-data.md`](docs/live-data.md)。

## 不做的事

- 不做 LLM 打分/简历解析。
- 不做自建登录/密码存储；登录走 Supabase Auth（可选，未登录仍可用 demo）。
- 不做支付、真实招聘。
- 不做实时新闻爬取。
- 不输出“失业概率”。
