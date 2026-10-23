# 部署 Pivott API

> 目标：API 无状态，demo 和 live 各连各的数据库。demo 可以随时重置；live 只由真实数据导入器写入。
>
> 当前状态：demo 已在 Supabase 项目 `hgqspcvuoggnqqxfimpn` 跑通；数据集分离、`job_postings` 和 `profiles` 的 migration 都已执行（14 张表、`meta` 4 行、12 条目录只读 policy + 4 条 `profiles` owner policy），API smoke 通过。
> 登录由 Supabase Auth 完成；后端只需 URL + anon key（[`auth.md`](auth.md)）。

## 1. 两套部署，两个库

| | demo | live |
|---|---|---|
| 域名 | `demo.example.com` | `app.example.com` |
| `PIVOTT_DATASET` | `demo` | `live` |
| 数据库 | SQLite `pivott.db`，或 demo 专用 Supabase 项目 | **另一个** Supabase 项目 / PostgreSQL |
| 启动 seed | 空库自动灌 `app/seed_data.py` | 永不自动 seed |
| `POST /api/seed` | 受 `ALLOW_DEMO_RESET` 控制 | 恒 403 |
| 重置 | 可 `--reset` / `POST /api/seed` | 不支持；由导入器更新 |
| 库标记 | `meta.dataset = demo` | `meta.dataset = live` |

不要用同一个库、也不要只靠 `where dataset = ...` 过滤：两套表结构相同，但库和进程都分开。`meta.dataset` 是防呆标记，配错时进程直接拒绝启动。

PostgreSQL 启动时只**校验**表是否存在，不会自动建表：DDL 只来自 `schema.sql` + `supabase/migrations/`，这样 RLS、约束和索引不会被 `create_all` 悄悄绕过。SQLite（本地 demo）仍会自动建表。

## 2. Demo 部署

### 2.1 Supabase demo 项目

按 [`../supabase/README.md`](../supabase/README.md) 建项目，在 SQL Editor 执行 `schema.sql`，再按文件名顺序执行 `supabase/migrations/*.sql`，复制 Session pooler（5432）连接串。

`.env` 只放服务端：

```text
PIVOTT_DATASET=demo
DATABASE_URL=postgresql+psycopg://...
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<publishable/anon key>
CORS_ORIGINS=https://demo-frontend.example
ALLOW_DEMO_RESET=false
```

seed 并校验：

```powershell
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe supabase\check_connection.py
```

首次用不带 `--reset` 的 seed：表已经由 `schema.sql` + migrations 建好，只插数据。需要清空重灌时用 `--reset`：Postgres 上执行 `TRUNCATE ... RESTART IDENTITY CASCADE`，保留 RLS、索引和约束；只有 SQLite 才会 drop/create。

期望输出：

```text
tables: 14 (expected 14)
job_postings             0  ok
profiles                 0  ok
meta                     4  ok
schema and seed counts are consistent
```

### 2.2 SQLite demo

```powershell
docker build -t pivott-api .
docker run --rm -p 8000:8000 `
  -e PIVOTT_DB=sqlite:////data/pivott.db `
  -e ALLOW_DEMO_RESET=true `
  -v pivott-data:/data `
  pivott-api
```

`/data` 必须挂持久卷；容器重建后数据还在。只跑一个实例。

## 3. Live 部署

1. **新建一个 Supabase 项目**（或独立 PostgreSQL），不要复用 demo 项目。
2. 在 SQL Editor 执行 [`../supabase/schema.sql`](../supabase/schema.sql)（12 张目录/信号表 + `meta`），再按文件名顺序执行 `supabase/migrations/*.sql`。
3. 跑真实数据导入器：写入 `skills / roles / tasks / ...`，设置 `sort_order` / `position`，并写 meta：

   ```sql
   insert into public.meta (key, value) values
     ('dataset', 'live'),
     ('seed_version', '2026.11.1'),
     ('data_as_of', '2026-11-01')
   on conflict (key) do update set value = excluded.value;
   ```

   不要跑 `python -m app.seed`：它会直接拒绝（`the built-in seed is demo-only`）。
4. 启动 API：

   ```text
   PIVOTT_DATASET=live
   PIVOTT_DB=postgresql+psycopg://live-project...
   CORS_ORIGINS=https://app-frontend.example
   ```

5. 验收：

   ```powershell
   curl.exe http://127.0.0.1:8001/api/health
   ```

   应为 `dataset: "live"`，counts 是真实数据量；`GET /api/seed` 的 `demoPersona` 为 `null`。

启动保护（会直接抛 `RuntimeError`，容器退出）：

- 库标记 `live` 但进程 `PIVOTT_DATASET=demo`，或反过来；
- live 进程连到一个**有数据但没有 `meta.dataset`** 的库（大概率是误连 demo 库）；
- live 进程没有给 `PIVOTT_DB` / `DATABASE_URL`（不会回退到 `pivott.db`）。

空库 + live 是允许的：会写 `meta.dataset=live`，API 返回空目录，等导入器填数据。

## 4. 已有 demo 库升级

旧库没有 `sort_order` / `position` / `meta`，新代码启动会报缺列。两种方式：

**保留数据（推荐）**

```text
1. SQL Editor 执行 supabase/migrations/202610221915_dataset_separation.sql
2. SQL Editor 执行 supabase/migrations/202610221930_skill_name_unique.sql
3. .\.venv\Scripts\python.exe scripts\backfill_demo_order.py
4. SQL Editor 执行 supabase/migrations/202610230045_job_postings.sql
5. SQL Editor 执行 supabase/migrations/202610231200_profiles.sql（登录用户表 + RLS）
```

回填脚本只 UPDATE 已有行 + 写 meta，不删数据；缺 seed 行时会列出缺失项并以非 0 退出。

**清空重灌（demo 数据可丢弃时）**

```powershell
.\.venv\Scripts\python.exe -m app.seed --reset
```

会清掉用户新增的 `evidence=user` 信号。

## 5. 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `PIVOTT_DATASET` | `demo` | `demo` 或 `live`；决定 seed / reset / 启动校验 |
| `PIVOTT_DB` | 空 | 当前数据集的连接串，优先级最高 |
| `DATABASE_URL` | 空 | 同上的通用名；live 必须给 `PIVOTT_DB` 或它 |
| `PIVOTT_AUTO_SEED` | demo `true` / live `false` | demo 空库启动时是否自动 seed；live 恒不 seed |
| `ALLOW_DEMO_RESET` | 源码 `true`；镜像 `false` | 关闭后 `POST /api/seed` 返回 403；live 恒 403 |
| `PIVOTT_SEED_VERSION` | demo `2026.10.1`；live `live` | 无 meta 时的回退；导入器应写 `meta.seed_version` |
| `PIVOTT_DATA_AS_OF` | demo `2026-10-01`；live 当天 | 无 meta 时的回退；导入器应写 `meta.data_as_of` |
| `CORS_ORIGINS` | `*` | 逗号分隔的前端 origin；生产必须收紧 |
| `SUPABASE_URL` | 从 `DATABASE_URL` 推断 | Supabase Auth / JWKS 的 base URL；推断不出时受保护端点返回 503 |
| `SUPABASE_ANON_KEY` | 空 | publishable/anon key，`/api/auth/config` 交给浏览器；不填时 `signInEnabled=false` |
| `SUPABASE_JWT_SECRET` | 空 | 只有 legacy HS256 项目需要；服务端专用 |
| `SUPABASE_JWKS_TTL_SECONDS` | `300` | JWKS 缓存秒数，夹在 30–3600 |

注意：用 Supabase 时不要同时设 `PIVOTT_DB` 和 `DATABASE_URL` 指向不同的库；`PIVOTT_DB` 会覆盖 `DATABASE_URL`。

## 6. 安全清单

- [ ] live 部署 `PIVOTT_DATASET=live`，且 `PIVOTT_DB` 指向 live 项目
- [ ] demo 部署 `ALLOW_DEMO_RESET=false`（或只在演示时临时打开）
- [ ] 两个库的 `meta.dataset` 分别是 `demo` / `live`
- [ ] `CORS_ORIGINS` 只列真实前端域名
- [ ] `DATABASE_URL` 只在服务端；浏览器只拿 `NEXT_PUBLIC_API_BASE`
- [ ] `.env` 不进 git；Supabase service role key 不下发
- [ ] `SUPABASE_ANON_KEY` 是 publishable/anon key，不是 service role key
- [ ] 14 张表都启用 RLS；12 张目录表只读，`profiles` 是 4 条 owner policy，`meta` 无 policy
- [ ] Supabase Auth 的邮箱确认策略符合 demo 预期（要立即登录就关掉 Confirm email）
- [ ] live 库的写入只走导入器/管理端，不经 `POST /api/seed`

## 7. 已知边界

- 登录是可选的：目录/计算接口不要求账号；未登录 profile 仍在 localStorage。登录用户的 profile/进度存在 `profiles`，跨设备可用。
- `POST /api/seed` 会 `TRUNCATE` 所有表（含 `profiles`）；生产保持 `ALLOW_DEMO_RESET=false`。
- 单 SQLite 实例不能水平扩展；多实例必须用 Postgres。
- 没有 Alembic；schema 变更走 `supabase/schema.sql` + `supabase/migrations/`。
- CI 的 `pytest` 用内存 SQLite；另有 `postgres` job 用 PostgreSQL 17 service 跑 `scripts/verify_pg.py`，覆盖 RLS、`TRUNCATE`、migration 和类型路径。
- live 导入器还没有实现；当前仓库只提供表结构、`meta` 约定和启动保护。

## 8. 验收记录

**2026-10-22（数据集分离前）**

- Supabase demo：12 张目录/信号表 + `meta`，`15 / 6 / 4 / 2 / 31 / 36 / 10 / 73 / 20 / 41 / 24 / 0 / 4`。
- `GET /api/health`：`6 / 31 / 15 / 20`；Aisyah fast `roleExposure = 0.763981`。
- `POST /api/seed` 在 `ALLOW_DEMO_RESET=false` 下返回 403。

**2026-10-22（数据集分离后）**

- Supabase demo：执行 migration + backfill 后 13 张表，`meta` 4 行，12 条只读 policy，全部表启用 RLS。
- `GET /api/health`（API 连 Supabase）：`dataset: demo`、`6 / 31 / 15 / 20`。
- `GET /api/seed`：`fa-invoice` 的 skills 为 `["erp", "excel"]`，`demoPersona` 为 Aisyah。
- `POST /api/analysis`（Aisyah，normal）：`roleExposure = 0.619031`，路线顺序 Operations Coordinator → Finance Systems Analyst → Marketing Executive。
- 本地 SQLite：25 个测试通过，含 live 拒绝 reset、live 拒绝 demo 库、DB 驱动 task skills / role SDGs。
- `PIVOTT_DATASET=live` 空库：`dataset: live`、counts 全 0、`POST /api/seed` 403。
- 把 demo 进程指向标了 `live` 的库：启动被拒绝。
- 本机 `scripts/verify_pg.py` 的内嵌 `initdb` 因 Windows restricted-token 报错未能运行；migration 已在真实 Supabase Postgres 上验证，CI 的 `postgres:17` job 会跑完整脚本。

**2026-10-23（Supabase Auth）**

- Supabase demo：执行 `202610230045_job_postings.sql` + `202610231200_profiles.sql`，14 张表，`profiles` 4 条 owner policy；`check_connection.py` 全绿。
- `GET /api/health` 仍为 `6 / 31 / 15 / 20`；`GET /api/auth/config` 从 `DATABASE_URL` 推断出项目 URL（`signInEnabled=false`，等 anon key）。
- `/api/auth/me`、`/api/me/profile` 无 token 返回 401；伪造 ES256 token 经真实 JWKS 校验后返回 401。
- pytest：85 passed（含 ES256/HS256、过期/aud/iss/role、profile CRUD、用户隔离、登录桥错误映射）。
- `scripts/verify_pg.py`：20 项全绿（本地 PostgreSQL 16.2），含 profiles migration、4 条 RLS policy、A/B 用户隔离、raw SQL 与 ORM 的 JSONB round-trip。
