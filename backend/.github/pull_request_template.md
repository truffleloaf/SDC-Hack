## 做了什么

<!-- 一句话说明改了什么、为什么改。 -->

## 检查

- [ ] 改了 `supabase/**`、`app/models.py`、`app/seed_data.py` 或 `reset_database()`？已跑 `python scripts/verify_pg.py`，全绿
- [ ] `pytest -q` 全绿
- [ ] 结构变更只走 `supabase/schema.sql`（基线，已冻结）或新增 `supabase/migrations/*.sql`，没有直接在 Supabase 控制台改线上库

## 备注

<!-- 对 demo 的影响、回滚方式，或需要 reviewer 特别注意的点。 -->
