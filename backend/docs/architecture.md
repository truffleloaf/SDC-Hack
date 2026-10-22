# Pivott 后端架构

> 状态：已实现。`backend/` 是前端 Next.js API 的 FastAPI 端口。

## 1. 目标与非目标

Pivott 回答四个问题：

1. 这个岗位里**哪些任务**会被 AI 影响（exposure 0–1）？
2. 按时长加权后，这个岗位的整体暴露度是多少（role exposure）？
3. 哪些**相邻岗位**能复用现有技能（fit / route score / gaps）？
4. 从当前水平到目标岗位，**最短可信的学习路径**是什么（周计划）？

**非目标**

- 不训练 LLM，不用 LLM 打分。
- 不实时爬取招聘网站或新闻。
- 不做账号体系、支付、真实招聘。
- 不输出“失业概率”；`roleExposure` 是时长加权暴露度。

## 2. 组件

```text
┌──────────────────────────┐        HTTP/JSON        ┌─────────────────────────┐
│ React / Next.js frontend │ ──────────────────────▶ │ FastAPI (backend/)      │
│ pivott-web-application-  │ ◀────────────────────── │ /api/* + /docs          │
│ design/                  │                         └───────────┬─────────────┘
└──────────────────────────┘                                     │
                                                                 │ imports
                                                     ┌───────────▼─────────────┐
                                                     │ app/data/seed.json      │
                                                     │ 6 roles · 31 tasks ·    │
                                                     │ 15 skills · 20 signals  │
                                                     └─────────────────────────┘
```

| 组件 | 职责 |
|---|---|
| `app/seed.py` | 加载 seed JSON，建立 `ROLE_BY_ID` / `TASK_BY_ID` / `SKILL_BY_ID` / `TASKS_BY_ROLE` |
| `app/engine.py` | 暴露度、分类、覆盖度、fit、gap、route score、pathway、confidence |
| `app/parsing.py` | 请求校验、base64url 不透明 id |
| `app/routers/*` | 每个 route group 一个模块 |
| `tests/golden.json` | 从前端 `engine.ts` 生成的预期输出 |

## 3. 数据

`app/data/seed.json` 是
`pivott-web-application-design/lib/data/seed.ts` 的 1:1 导出：

| 数据 | 数量 |
|---|---:|
| roles | 6 |
| tasks | 31 |
| skills | 15 |
| signals | 20 |
| SDGs | 4 |
| resources | 25 |
| scenarios | 2 |

角色：Finance Admin、Finance Systems Analyst、Data Analyst、Marketing Executive、
Customer Support Specialist、Operations Coordinator。

演示人物：Aisyah（Finance Admin，15 个技能等级，默认 6 小时/周；API 示例也使用 8 小时/周）。

## 4. 一次分析请求

```text
POST /api/analysis {roleId, selections, skills, scenario, hoursPerWeek}
  │
  ├─ parse_profile：校验 role、任务、技能、scenario、hours、freeOnly
  ├─ score_tasks：每个任务算 adjustment / exposure / classification
  ├─ role_exposure：按 share 加权
  ├─ confidence：信号覆盖率 + verified 来源占比
  └─ compute_routes：coverage / similarity / fit / targetExposure / gaps / weeks
```

返回：

```json
{
  "scenario": "normal",
  "roleExposure": 0.619,
  "confidence": "Medium",
  "tasks": [],
  "routes": [],
  "illustrative": true
}
```

## 5. API 契约

| 方法 | 路径 | 返回 |
|---|---|---|
| GET | `/api/health` | `status / seedVersion / dataAsOf / counts` |
| GET | `/api/seed` | 完整 seed（version、asOf、roles、tasks、skills、signals、resources、scenarios、sdgs、demoPersona） |
| POST | `/api/seed` | `reset: true` + demoPersona |
| POST | `/api/profiles` | `id / profile / storage: "client"` |
| POST | `/api/analysis` | `scenario / roleExposure / confidence / tasks / routes / illustrative` |
| POST | `/api/pathways` | `id / targetRoleId / levels / hoursPerWeek / freeOnly / steps / totalHours / weeks` |
| GET | `/api/pathways/{id}` | 同上，从 base64url id 重建 |
| GET | `/api/roles/{id}/tasks?scenario=` | `role / scenario / roleExposure / tasks` |
| GET | `/api/signals` | `asOf / count / signals[]`（含 recency） |
| GET | `/api/sdgs` | `sdgs[]`（每个 SDG 带 roles） |

错误：

- 非法 profile / 未知 role：`400 {"error": "..."}`
- 未知 role 的 tasks / 未知 pathway：`404 {"error": "..."}`

## 6. 评分引擎

所有公式在 `app/engine.py`，与前端逐函数对应：

```text
recency           = 0.5 ^ (age_days / 180)
signal_adjustment = clamp(sum(strength × direction × recency × impact), -0.2, 0.2)
exposure          = clamp(base_exposure × scenario.multiplier + signal_adjustment, 0, 1)
role_exposure     = sum(time_share × exposure)
classification    = Automate if exposure >= 0.65 and human_judgment < 0.4
                    Protect  if human_judgment >= 0.65
                    Augment  otherwise
skill_coverage    = sum(importance × min(current / required, 1)) / sum(importance)
fit               = 100 × (0.8 × coverage + 0.2 × task_similarity)  (falls back to coverage)
gap               = max(0, required - current)
gap_priority      = gap × importance × (role_demand / 100)
weeks             = ceil(sum(gap_hours) / hours_per_week)
route_score       = 0.7 × fit + 0.3 × 100 × (1 - target_exposure)
```

关键性质：

- **确定性**：同一输入、同一 seed，结果逐位一致。
- **可解释**：每个 route 带 `coverage / similarity / fit / targetExposure / gaps`。
- **可对拍**：`tests/golden.json` 是最有力的证据。

## 7. 安全与部署

- 无登录、无数据库、无密钥。演示用，**不要直接公开部署**。
- CORS 默认仅允许已配置的生产域名与 localhost；可用 `PIVOTT_CORS_ORIGINS` 明确设置，不能代替认证或限流。
- 部署：`uvicorn app.main:app --host 0.0.0.0 --port $PORT`。
- 当前 Vercel 配置仅公开 `/api/*`；`/docs` 和 `/openapi.json` 不公开，独立后端本地可用。
- 数据是合成的；`signals[].evidence` 区分 `verified` / `illustrative`。

## 8. 与前端的关系

- “Verify with API”通过同源 `/api/analysis` 检查本地结果；Vercel 下转发到 FastAPI，独立 Next.js 下使用 Route Handler。
- 前端目前也可以完全不调后端（它自己直接 import engine/seed）；FastAPI 是**可替换的独立后端**，不是 demo 的硬依赖。
- 这也是为什么后端保持无状态：不引入第二套 profile/pathway 存储语义。

## 9. 已知限制

- 没有数据库持久化；pathway 进度只在客户端。
- 没有 auth / rate limit。
- 没有 admin 加信号 + recompute diff 端点（repo 前端目前也没有这个 API）。
- 根目录已有 `.github/workflows/backend-tests.yml` 和 `.github/workflows/frontend.yml`，分别验证后端与前端。

英文版本：[architecture.en.md](architecture.en.md)。自定义任务与已应用信号只在用户点击验证时发送；服务端校验、clamp 并始终标为 `user`，不持久化。
