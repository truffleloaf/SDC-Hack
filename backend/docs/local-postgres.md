# 本地 PostgreSQL 验证

> 目的：在把 schema / seed / migration 的改动推到 Supabase 之前，先在**真实 PostgreSQL** 上跑一遍。
> SQLite 测不出 RLS、`TRUNCATE`、`numeric`/`date`、psycopg 这几类问题，而它们恰好是线上最容易坏的地方。

## 一条命令

```powershell
# 首次：装内嵌 PostgreSQL（不需要 Docker）
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt

# 每次改完 schema / migration / seed
.\.venv\Scripts\python.exe scripts\verify_pg.py
```

脚本做的事：

1. 在 `.tmp/` 下起一个一次性 PostgreSQL（`pgserver`，自带二进制，不占用 5432）。
2. 建一个独立的 `pivott_verify` 库，执行 [schema.sql](../supabase/schema.sql)。
3. 用真实的 SQLModel 代码灌 seed。
4. 校验基线：13 张表、266 行、13 张表 RLS、12 条只读 policy、6 个基线命名索引、5 类非法写入被拒绝。
5. 跑 `reset_database()`——即 PostgreSQL 才有的 `TRUNCATE ... RESTART IDENTITY CASCADE` 分支——再 re-seed。
6. 建 Supabase `auth` 的替身（`auth.users` / `auth.uid()` / `authenticated` role），再按文件名顺序执行 [supabase/migrations/](../supabase/migrations/) 里的 `*.sql`（数据集分离 + `skills.name` 唯一索引 + `job_postings` + `profiles`），校验 8 个非主键索引、重复技能名被拒绝、`profiles` 4 条 owner policy 和 A/B 用户隔离。
7. 用 `TestClient` 打真实 API：health、Aisyah 62% / 76.4%、FSA fit 56 / 90 小时 / 15 周、写信号 + recompute。
8. 删库、停服务、删数据目录。

全部通过时退出码为 0，最后一行是 `PostgreSQL path is healthy.`；任何一项失败都会打印 `[FAIL]` 和原因，并以 1 退出。

## 用 Docker 或其他 PostgreSQL

不想装 `pgserver`，或想用和 Supabase 一致的版本：

```powershell
docker run --rm -d --name pivott-pg -p 5433:5432 `
  -e POSTGRES_PASSWORD=dev postgres:17

.\.venv\Scripts\python.exe scripts\verify_pg.py `
  --url postgresql://postgres:dev@localhost:5433/postgres
```

`--url` 也可以指向 CI service、本机安装的 PostgreSQL 或一个**一次性**的 staging 项目。脚本只创建/删除名为 `pivott_verify` 的库，不碰其他数据库。

## 这个脚本防的是什么

| 线上才会发生的事 | SQLite 本地测试 | 本脚本 |
|---|---|---|
| RLS policy 写错，表“存在但读不到” | 测不出（没有 RLS） | 校验 12 条目录只读 policy + anon 可读不可写；`meta` 无 policy；`profiles` 4 条 owner policy + 跨用户隔离 |
| `reset_database()` 的 `TRUNCATE` 分支报错 | 走不到（SQLite 走 drop/create） | 真跑一次再 re-seed |
| `numeric` 返回 `Decimal`，JSON 序列化 500 | 测不出（SQLite 宽松） | 断言 Decimal → JSON number |
| migration 的 `ALTER` 语法/顺序错误 | 测不出（不执行 migration） | 在 baseline 上按序执行 |
| 改完 `schema.sql` 以为生效、其实 `IF NOT EXISTS` 跳过了 | 测不出 | 先建空库再重跑，验证幂等 |
| 约束/外键在 Postgres 上没拦住脏数据 | 部分测不出 | 5 类非法写入必须报错 |

## 什么时候该跑

- 改 `supabase/schema.sql`（基线）之后；
- 新增 `supabase/migrations/*.sql` 之后——**先在本地跑通，再去 Supabase SQL Editor 执行**；
- 改 `app/models.py`、`app/seed_data.py`、`app/seed.py`、`reset_database()` 之后；
- 演示前彩排。

## CI

[.github/workflows/backend-tests.yml](../../.github/workflows/backend-tests.yml) 里加了 `postgres` job：每次 push / PR 用 `postgres:17` service 跑同一个脚本。`pytest` job 仍然用内存 SQLite，保持快。

## 边界

- `pgserver` 自带 PostgreSQL 16，Supabase 当前是 17。方言、RLS、`TRUNCATE`、类型行为一致，但 17 才有的新语法测不出来；要完全对齐就用上面的 Docker `postgres:17`。
- `anon` 测试是本地模拟：临时建一个只能 `select` 的角色，验证“可读不可写”。Supabase 真实的 `anon`/`authenticated` 角色和 grant 仍以 `supabase/check_connection.py` + 手动 smoke 为准。
- 脚本默认**拒绝**在 `*.supabase.co` / `*.supabase.com` 上运行，避免把演示库当试验田。确实要指向 staging 项目时加 `--allow-supabase`。
- 不会读你的 `.env`：脚本在进程内覆盖 `DATABASE_URL`，并断言 app 的 engine 指向 `pivott_verify`，否则直接退出。

## 常见问题

- **第一次启动慢**：`pgserver` 要解压 PostgreSQL 二进制并 `initdb`，约 10–20 秒；整套验证通常 20 秒内结束。
- **端口冲突**：不需要担心，内嵌模式随机选端口。
- **想手工查库**：加 `--keep`，脚本会保留服务器和库并打印连接串；用完按输出里的 `DROP DATABASE` 清理。
- **Windows 没有 Docker**：不影响，内嵌模式就是为这种情况准备的。
- **Windows 上 `initdb` 报 `could not create restricted token: error code 87`**：这是受限令牌/沙箱环境阻止 `initdb` 降权，不是 schema 问题；改用 `--url` 指向 Docker/本机 PostgreSQL，或让 CI 的 `postgres:17` job 跑。
