# [P0-2] 评分引擎：公式与单测

**Labels:** `backend`, `p0`, `engine`  
**Milestone:** M2 — engine + tests  
**Depends on:** P0-1  
**Blocks:** P0-3, P1-4

## 目标

用**纯 Python、确定性**函数复刻前端 `lib/engine.ts`。引擎不碰数据库、不碰 HTTP、不调用 LLM。

公式的唯一说明见 [`../data-model.md`](../data-model.md) 第 7 节。

## 范围

### 做

- `recency = 0.5 ** (age_days / 180)`；`age_days = max(0, as_of − date)`。
- `signal_adjustment = clamp(Σ(strength × direction × recency × impact), −0.2, +0.2)`。
- `exposure = clamp(base_exposure × scenario.multiplier + signal_adjustment, 0, 1)`。
- `role_exposure = Σ(time_share × exposure)`。
- `classification`：`Automate`（exposure ≥ 0.65 且 human_judgment < 0.4）/ `Protect`（human_judgment ≥ 0.65）/ `Augment`（其余）。
- `skill_coverage = Σ(importance × min(level / required, 1)) / Σ importance`。
- `task_similarity` = 用户任务技能集合与目标角色任务技能集合的 Jaccard；任一为空时返回 `None`。
- `fit = 100 × (0.8 × coverage + 0.2 × similarity)`；similarity 为 `None` 时退回 `100 × coverage`。
- `gap = max(0, required − level)`；`gap_priority = gap × importance × (role_demand / 100)`；`gap_hours = gap × skill.hoursPerLevel`。
- `weeks = ceil(Σ gap_hours / hours_per_week)`。
- `route_score = 0.7 × fit + 0.3 × 100 × (1 − target_exposure)`。
- `confidence`：覆盖 ≥80% 且 verified 权重 ≥60% → `High`；覆盖 ≥50% → `Medium`；否则 `Low`。
- 把常量集中到 `app/config.py`：`HALF_LIFE_DAYS=180`、`MAX_SIGNAL_ADJUSTMENT=0.2`、`AUTOMATE_EXPOSURE=0.65`、`HUMAN_JUDGMENT=0.4/0.65`、`FIT_WEIGHTS=0.8/0.2`、`ROUTE_WEIGHTS=0.7/0.3`。

### 不做

- 不连数据库、不写 router。
- 不调 LLM；不用随机数。
- 不叫“失业概率”。
- 不返回旧的 `breakdown` / `match_score` / `role_risk` 字段。

## 黄金用例（必须逐位一致）

Aisyah（Finance Admin，6 个任务，默认 share，6 条技能）：

- Normal：`role_exposure = 0.6190...` → UI 显示 **62%**。
- Fast：`role_exposure = 0.7640...` → UI 显示 **76%**。
- Invoice entry：Normal **82.2%**，Fast **100%**；Exception handling：Normal **36.0%**，Fast **46.0%**。
- Normal 第一条路线 `operations-coordinator`（score 58.8）；Fast 第一条 `finance-systems-analyst`（score 55.5）。
- FSA：`coverage=0.5868`、`similarity=0.4545`、`fit=56.0`、`target_exposure=0.4576`、`score=55.5`、`total_gap_hours=90`、`weeks=15`（6h/周）。
- 8h/周 = 12 周；12h/周 = 8 周。

## 验收标准

- [ ] 每个公式都有单元测试，覆盖 0、1、负数、空列表、除零。
- [ ] 同一输入跑两次，结果逐位一致。
- [ ] Normal 和 Fast 产生不同 exposure 和不同 route 排名（用 seed 验证 62% → 76%、Ops → FSA）。
- [ ] gap 为 0 时不产生空步骤；空 selections 返回 `roleExposure = 0` 而不是 500。
- [ ] `similarity is None` 时 fit 正确退回 coverage。
- [ ] 引擎测试不依赖 FastAPI、不依赖 Supabase。
- [ ] `pytest -q` 全绿。

## 关键文件

- `app/config.py` — 上述常量
- `app/services/exposure.py`
- `app/services/matching.py`
- `app/services/pathway.py`
- `tests/test_formulas.py` — 待建

## 演示证据

- `pytest -q` 输出
- Invoice entry 的 exposure 手算 vs 引擎输出
- Normal/Fast 两次 `computeRoutes` 的第一名对比
