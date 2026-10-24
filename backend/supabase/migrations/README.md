# Supabase migrations

`schema.sql` 是**基线**：空库先跑它，再按文件名顺序执行本目录的 migration，最后 `python -m app.seed`。

第一次部署之后，结构变更一律新增本目录的 migration；已有库不要靠重跑 `schema.sql` 补列。

## 命名

```text
YYYYMMDDHHMM_short_description.sql
```

例如：

```text
202610211030_add_signal_skill_impacts.sql
202610221400_profiles_add_target_role.sql
```

## 规则

- **不要修改已经执行过的 migration**；要改就新增一个。
- 一个文件只做一件事：建表 / 加列 / 加索引 / 改 RLS 分开写。
- 表结构和它的 RLS、`grant` 写在同一个 migration 里，避免出现“表建了但读不到”。
- 先在 Supabase 的分支库或本地 Postgres 跑通，再进主库。本地一条命令即可：`python scripts/verify_pg.py`（见 [`docs/local-postgres.md`](../../docs/local-postgres.md)），它会先建空库、跑 `schema.sql`，再按文件名顺序执行本目录的 migration。
- 改数据量时，同步改 `supabase/check_connection.py` 的 `expected` 和 `docs/data-model.md`。

## 执行方式

**Supabase Dashboard**

1. SQL Editor → New query
2. 粘贴 migration 全文
3. Run
4. 在 `meta` 里记录 schema 版本（如果该 migration 涉及）

**psql**

```powershell
psql "$env:DATABASE_URL" -f supabase/migrations/202610211030_example.sql
```

## 回滚

Supabase 不自动回滚。每个 migration 在 PR 描述里写清楚：

- 影响哪些表；
- 是否需要回填数据；
- 回滚 SQL（如果可回滚）；
- 是否影响 RLS / 前端读模型。

## 当前基线

- `schema.sql`：12 张目录/信号表 + `meta`（13 张）、`sort_order` / `position`、索引、RLS；`meta` 只有 service role 可读写。
- seed 由 `python -m app.seed --reset` 灌入；行数 15 / 6 / 4 / 2 / 31 / 36 / 10 / 73 / 20 / 41 / 24 / 4。
- 已部署的旧库不要重跑 `schema.sql` 指望补列（`create table if not exists` 会跳过）；跑 `202610221915_dataset_separation.sql` 追平结构，再 `python scripts/backfill_demo_order.py` 回填展示顺序。
- `202610221930_skill_name_unique.sql`：给 `skills.name` 加 `lower(name)` 唯一索引，落实 `data-model.md` 里的唯一约束。
- `202610230045_job_postings.sql`：live 在招职位表（demo 为空）。
- `202610231200_profiles.sql`：登录用户的 `profiles`（1 行 / `auth.users` 用户）+ 4 条 owner RLS policy + `authenticated` grant + `updated_at` trigger。依赖 Supabase 的 `auth` schema，跑完共 14 张表。
- 新结构变更仍按上面的规则新增 migration；`schema.sql` 只保存建库基线，全新库也要在它之后跑完本目录 migration，才能和已部署库一致。
