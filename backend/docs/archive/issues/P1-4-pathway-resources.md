Historical log. Not maintained.

# [P1-4] 路径与资源：即时计算 / 可勾选 / 可导出

**Labels:** `backend`, `p1`, `engine`  
**Milestone:** M3 — API  
**Depends on:** P0-1, P0-2  
**Blocks:** P1-6

## 目标

把 gap 变成**有序、带工时、可勾选**的周计划，而不是一堆课程链接。demo 的路径不落库，每次按输入即时计算。

## 范围

### 做

- `POST /api/pathways`：按 `gap_priority` 生成 steps；不写数据库。
- `GET /api/pathways/{id}`：`id` 是 base64url 的 `{targetRoleId, levels, hoursPerWeek, freeOnly}`，反解后重算。
- step 字段：`id`、`skillId`、`title`、`skills`、`resource`、`hours`、`startWeek`、`endWeek`、`deliverable`、`why`。
- `freeOnly=true` 时优先选该技能第一个免费资源；没有免费资源时 `resource = null`。
- 资源必须来自 seed 的 24 条；URL 不能编造。
- `weeks = ceil(Σ hours / hours_per_week)`；`hoursPerWeek` 变化时重算。
- 进度由前端 `completedSteps` 维护；不建 `pathway_steps.status`。
- `.ics` 由前端 `lib/ics.ts` 生成，每个 step 一个事件。

### 不做

- 不建 `pathways` / `pathway_steps` 表。
- 不做 `POST /api/pathways/preview`：`POST /api/pathways` 本身就不落库。
- 不做 `PATCH /api/pathways/steps/{id}`。
- 不调用 LLM 编课程。
- 不写真实课程购买/支付。

## 验收标准

- [ ] FSA + Aisyah：5 步、90 小时；6h/周 = 15 周，8h/周 = 12 周，12h/周 = 8 周。
- [ ] 步骤顺序：automation → process → sql → erp → stakeholder（按 priority）。
- [ ] `freeOnly=true` 时所有 `resource.free = true`（或 `null`）。
- [ ] 所有 `resource.url` 都能在 seed 的 `resources` 里找到。
- [ ] 连续调用 `POST /api/pathways` 3 次，数据库/存储没有新增行。
- [ ] `GET` 同一个 id 返回与 `POST` 相同的 steps 和 weeks。
- [ ] 没有 gap 时返回空 steps + `totalHours=0`，不报 500。
- [ ] 勾选步骤后，前端进度环和路线动画更新；`.ics` 事件数 = steps 数。

## 关键文件

- `app/services/pathway.py`
- `app/routers/pathways.py`
- `docs/data-model.md` 的 Skill / Resource / PathwayStep
- 前端 `lib/engine.ts` 的 `buildPathway` / `lib/ics.ts`

## 演示证据

- 同一 profile 在 6/8/12 小时下的周数对比
- 一条 pathway 的 JSON（steps + resources）
- 勾选前后进度截图
- 下载的 `.ics` 文件
