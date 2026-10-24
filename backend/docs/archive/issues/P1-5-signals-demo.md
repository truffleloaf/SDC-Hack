Historical log. Not maintained.

# [P1-5] 信号与演示控制：add signal + diff + reset

**Labels:** `backend`, `p1`, `demo`  
**Milestone:** M4 — demo ops  
**Depends on:** P0-1, P0-3  
**Blocks:** P1-6

## 目标

把“加一条信号 → 分数立刻变化”做成现场可演示、可解释、可回滚的闭环。字段和示例见 [`../api-design.md`](../api-design.md) 第 4.8 / 5 节。

## 范围

### 做

- `GET /api/signals`：20 条 seed + 用户信号（如果后端接管），按日期降序，带 `recency`。
- `POST /api/signals`：写入一条 `evidence = "user"` 的信号；校验日期 ≤ 2026-10-01、https URL、headline 8–140、至少 1 个 task、strength 0.1–1、impact 0.05–0.4。
- `POST /api/analysis/recompute`：应用 pending 信号，返回 `before / after / delta / changed`；`changed` 只含有实际变化的任务（阈值 0.0005）。
- `POST /api/seed`：清空用户信号，恢复 20 条 seed。
- 前端用 `recentlyChanged` 高亮 7 秒；后端只返回 diff，不做动画。
- 信号只影响 task，不影响 role demand；不再有 `signal_role_impacts`。

### 不做

- 不实时爬取新闻。
- 不编辑 catalog（角色/任务/技能）——那是 seed 的事。
- 不做用户系统。
- 不做旧的 `/api/admin/signals`、`/api/admin/recompute`、`/api/admin/seed`。

## 验收标准

- [ ] seed 信号数 = 20：8 条 `verified`、12 条 `illustrative`；14 条 +1、6 条 −1。
- [ ] 新增一条 `Invoice entry` 信号（date 2026-09-30、strength 0.60、impact 0.15、direction +1）后，Normal 下 Invoice 82% → 91%，整体 62% → 65%。
- [ ] `recompute.changed` 至少包含 1 个 task，`delta` 与 before/after 一致。
- [ ] 没有变化的信号/任务返回空 `changed`，仍 200。
- [ ] `POST /api/seed` 后信号数回到 20，分析结果回到 62% 基线。
- [ ] `evidence` 在列表和详情里可见；`user` 信号可删除。
- [ ] 日期晚于 `2026-10-01`、非 https、无 task 的请求都被拒。

## 关键文件

- `app/routers/signals.py` — `GET /api/signals` + `POST /api/signals`
- `app/routers/analysis.py` — `POST /api/analysis/recompute`
- `app/seed.py`
- 前端 `app/signals/page.tsx`、`components/signals/admin-sheet.tsx`

## 演示证据

- 加信号前后的 analysis 对比 JSON
- `recompute` 的 `changed` 数组
- 30 秒屏幕录制（加信号 → 高亮 → reset）
