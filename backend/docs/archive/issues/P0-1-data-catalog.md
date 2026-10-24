Historical log. Not maintained.

# [P0-1] 数据与目录层：schema + seed

**Labels:** `backend`, `p0`, `db`  
**Milestone:** M1 — schema + seed  
**Depends on:** 无  
**Blocks:** P0-2, P0-3, P1-4, P1-5

## 目标

把“角色—任务—技能—信号—SDG—资源”这套目录做成**唯一事实来源**：空库执行一次 schema + seed，就能支撑全部 demo 页面和 3 分钟演示。

字段、约束和演示档案以 [`../../data-model.md`](../../data-model.md) 为准。

## 范围

### 做

- 按 `data-model.md` 第 10 节建 12 张目录/信号表（`skills`、`roles`、`role_requirements`、`tasks`、`task_skills`、`resources`、`job_postings`、`signals`、`signal_task_impacts`、`scenarios`、`sdgs`、`role_sdgs`）。
- 数据量：**6 roles / 31 tasks / 15 skills / 36 role_requirements / 24 resources / 20 signals / 4 SDGs / 2 scenarios / Aisyah**。
- 任务：Finance Admin 6 个，其余 5 个角色各 5 个；同一角色 `default_share` 合计 100。
- 技能：15 个，含 `hoursPerLevel`、`deliverable`、`why`；删除旧 `aliases`。
- 任务技能只存 `(task_id, skill_id)`，**没有 importance**。
- 信号：8 条 `verified`、12 条 `illustrative`；strength 0–1；只影响 task，不影响 role。
- SDG 只有 4 个（4/8/9/10），只有 role→SDG 映射，没有 skill→SDG；带 `color`。
- 可重复执行、不重复插入的 seed；重复跑行数不变。
- 给 seed 写校验：数量、外键、share 合计、URL、evidence 枚举。

### 不做

- 不写评分公式。
- 不写 HTTP 接口。
- 本工作包不建 `profiles` / `pathways` / `pathway_steps`；登录用户的 `profiles` 由后续 migration 增加，pathway 仍不落库。
- 不接真实爬虫。

## 验收标准

- [ ] 空库执行 schema + seed，表数 = 11，行数 = 6 / 31 / 15 / 36 / 24 / 20 / 4 / 2。
- [ ] 再执行一遍，行数不变，无重复。
- [ ] 每个 role 的 `Σ default_share = 100`；Finance Admin 为 30/20/15/15/10/10。
- [ ] 每条 signal 至少影响 1 个 task；`direction ∈ {+1,−1}`；`strength ∈ [0,1]`；`impact ∈ [0,0.4]`。
- [ ] `evidence` 只有 `verified` / `illustrative` / `user`。
- [ ] 所有 resource URL 是 `https://`；免费 17 条、付费 7 条。
- [ ] 没有 `augmentation_potential`、`base_demand`、`skill_sdgs`、`signal_role_impacts`、`pathway_steps.status`。
- [ ] 没有真实个人数据；Aisyah 是合成档案。

## 关键文件

- `supabase/schema.sql` — 12 张表 + `meta` + 索引 + RLS（已重写）
- `app/models.py` — 12 张 SQLModel 目录/信号表（已重写）；登录用户的 `profiles` 是后续新增
- `app/seed_data.py` — 15 技能 / 20 信号 / 4 SDG / 24 资源 / 31 任务（已替换）
- `supabase/check_connection.py` — 连接与计数校验

## 与旧数据的具体冲突

| 项 | 旧值 | 新值 |
|---|---:|---:|
| skills | 16 | 15 |
| tasks | 30 | 31 |
| signals | 15 | 20 |
| SDGs | 17 | 4 |
| resources | 18 | 24 |
| roles 组成 | 含 AP Automation Specialist、ESG Reporting Analyst | 含 Marketing Executive、Customer Support Specialist |
| 表数 | 17 | 12 目录/信号 + `meta`；登录用户的 `profiles` 由后续 migration 增加 |

## 演示证据

- 14 张表（含 `meta`、`job_postings`、`profiles`）的 `select count(*)` 结果
- Aisyah 的 6 个任务和 share 合计 100 的查询结果
- 一条 signal 的完整 JSON（含 `evidence`、`impacts`、来源链接）
- 重复执行 seed 前后行数截图
