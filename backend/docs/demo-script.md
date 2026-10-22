# Pivott 后端演示脚本（约 3 分钟）

> 目标：让评委在 3 分钟内看到后端的**数据、公式、契约和测试证据**，而不是只看前端截图。

## 0. 演示前 60 秒

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest -q                     # 64 passed
uvicorn app.main:app --port 8000
```

- [ ] 打开 <http://127.0.0.1:8000/docs>
- [ ] 打开 <http://127.0.0.1:8000/api/health>
- [ ] 关闭通知和无关标签
- [ ] 记下 `seedVersion = 2026.10.2`、`dataAsOf = 2026-10-01`

## 1. 数据（0:00–0:30）

**`GET /api/health`**

```json
{
  "status": "ok",
  "seedVersion": "2026.10.2",
  "dataAsOf": "2026-10-01",
  "counts": { "roles": 6, "tasks": 31, "skills": 15, "signals": 20 }
}
```

**`GET /api/seed`**：6 角色 / 31 任务 / 15 技能 / 20 信号 / 4 SDG / 25 资源 / 2 情景 / Aisyah。

> 话术：数据不是前端硬编码，后端有同一份 versioned seed；每个信号都有日期、来源和 evidence。

## 2. 分析（0:30–1:30）

**`POST /api/analysis`**，用 Aisyah 的 `finance-admin` 任务与技能：

```json
{
  "scenario": "normal",
  "roleExposure": 0.619,
  "confidence": "Medium",
  "tasks": "6 个",
  "routes": "3 条"
}
```

Normal 排名：

1. `operations-coordinator` — score 58.79
2. `finance-systems-analyst` — score 58.29
3. `marketing-executive` — score 52.25

切到 `"scenario": "fast"`：

- `roleExposure` 变成 **0.764**
- 排名变成：`finance-systems-analyst` 55.50 → `operations-coordinator` 55.14 → `marketing-executive` 47.87

指着一个任务：`fa-invoice` exposure **0.822**，classification **Automate**；
`fa-exception` 更依赖 human judgment。

> 话术：Normal/Fast 不是换标签，是同一套公式重新算，排名真的会变。

## 3. 任务地图（1:30–2:00）

**`GET /api/roles/finance-admin/tasks?scenario=normal`**

- 6 个任务，`roleExposure = 0.619`
- 每个任务都有 `adjustment`、`exposure`、`classification`、`skills`、`tryThisWeek`

> 话术：每个数字都能拆开，不是黑箱百分比。

## 4. 路径（2:00–2:30）

**默认故事：`POST /api/pathways`**，`targetRoleId = "operations-coordinator"`，`hoursPerWeek = 6`：

```json
{
  "totalHours": 48,
  "weeks": 8,
  "steps": "4 个"
}
```

每个 step 带：

- `startWeek` / `endWeek`
- `resource {title, provider, url, free}`
- `deliverable`
- `why`

把 `freeOnly` 设为 `true`，所有资源都变成免费选项。

> 话术：路径不是课程列表，是按 gap 优先级和工时排出来的周计划。

## 5. 信号 / SDG / 测试（2:30–3:00）

**`GET /api/signals`**：20 条，按日期倒序，每条带 `recency`（0–1）。
**`GET /api/sdgs`**：4 个 SDG，每个带映射的 role id。

**`pytest -q`**：

```text
64 passed
```

> 话术：同一份 seed、同一套公式，Python 端口和前端 `engine.ts` 的输出做过 golden 对拍；没有 LLM，没有随机数。

## 6. 常见问答

**Q：后端用什么数据库？**
> 这个后端和前端 API 一样是无状态的：profile 只校验回显，pathway id 编码输入，进度在客户端。评委看到的是数据、公式、契约和测试。Supabase 持久化是可选扩展。

**Q：为什么不用 LLM？**
> 暴露度、fit、gap、周数都是确定性公式，可以手算、可以单测、可以复现。LLM 最多写解释文案，不能参与打分。

**Q：62% 是失业概率吗？**
> 不是。`roleExposure` 是按时长加权的任务暴露度，不是失业概率。

**Q：怎么证明和前端一致？**
> `tests/golden.json` 是从前端 `engine.ts` 生成的；`test_engine.py` 对 Normal/Fast、任务地图、pathway 做深度对拍。

## 7. 兜底

| 故障 | 处理 |
|---|---|
| 端口被占 | `uvicorn ... --port 8010` |
| Swagger 打不开 | 直接 `curl http://127.0.0.1:8000/api/health` |
| 现场网络差 | 全部本地，无外部依赖 |
| 时间不够 | 只演示 `/api/health` → `/api/analysis` normal/fast → `pytest -q` |

英文版本：[demo-script.en.md](demo-script.en.md)。在地图点击 “Verify with API”，Normal/Fast 都应匹配；添加信号后先 Recompute 再验证。API 出错不影响本地计算。
