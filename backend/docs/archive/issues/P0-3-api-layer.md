Historical log. Not maintained.

# [P0-3] API 服务层：demo 契约

**Labels:** `backend`, `p0`, `api`  
**Milestone:** M3 — API  
**Depends on:** P0-2  
**Blocks:** P1-4, P1-5, P1-6

## 目标

给前端 demo 一套稳定、可解释、与页面数字一致的 HTTP 契约。完整字段、示例和错误码以 [`../../api-design.md`](../../api-design.md) 为准。

核心：`POST /api/analysis` 一次返回 `tasks[] + routes[] + roleExposure + confidence`；请求体是内联 `ProfileInput`，不是 `profile_id`。

## 范围

### 做

- `GET /api/health`：`status` / `seedVersion` / `dataAsOf` / counts。
- `GET /api/seed`、`POST /api/seed`：完整 seed、重置。
- `POST /api/profiles`：校验并回显 `ProfileInput`，`storage = "client"`，不落库。
- `POST /api/analysis`：任务地图 + 技能 + 3 条路线。
- `POST /api/pathways`：生成路径，不落库；`id` = base64url 输入。
- `GET /api/pathways/{id}`：反解重算。
- `GET /api/roles/{id}/tasks?scenario=normal|fast`：默认 share 的评分镜像。
- `GET /api/signals`：20 条 + `recency`，按日期降序。
- `GET /api/sdgs`：4 个 SDG + 角色反向索引。
- 演示控制（前端现在本地实现，后端接管时提供）：`POST /api/signals`、`POST /api/analysis/recompute`。
- 错误：`{error}`；未知 role 400、role 不存在 404、pathway id 无效 404。
- CORS、OpenAPI 示例、`Cache-Control: no-store`。

### 不做

- 不在 router 里写公式。
- 不返回 `{data, meta, sources}` 包装。
- 本工作包不建服务端 profile/pathway；登录用户的 profile 由后续 `/api/me/profile` 接管（见 [`../../auth.md`](../../auth.md)），未登录 demo 不受影响。
- 不做 `/api/meta`、`/api/demo`、`/api/analysis/demo`、`/api/skills`、`/api/scenarios`、`/api/admin/*`（见 api-design 第 8 节）。
- 不把数据库连接串或 service role key 返回给前端。

## 验收标准

- [ ] `/api/health` 的 counts = 6 / 31 / 15 / 20。
- [ ] `/api/seed` 返回 6 roles、31 tasks、15 skills、20 signals、24 resources、2 scenarios、4 sdgs。
- [ ] Aisyah + Normal：`roleExposure = 0.619`（显示 62%）；Fast：`0.764`。
- [ ] Normal `routes[0].roleId = operations-coordinator`；Fast `routes[0].roleId = finance-systems-analyst`。
- [ ] FSA：`fit = 56.0`、`targetExposure = 0.4576`、`score = 55.5`、`weeks = 15`（6h/周）。
- [ ] `POST /api/pathways` 返回 5 步、`totalHours = 90`；8h/周 → 12 周，12h/周 → 8 周。
- [ ] 同一输入连续调用两次，响应逐位一致。
- [ ] 未知 roleId 返回 400 `Unknown roleId`；缺 targetRoleId 返回 400 `targetRoleId is required`。
- [ ] 所有响应无 envelope；没有 500。
- [ ] 前端 6 个页面所需字段都能从这 10 个端点拿到，不需要硬编码业务数据。

## 关键文件

- `app/main.py` — FastAPI 入口、CORS、中间件装配；`app/errors.py` — 统一异常处理
- `app/schemas.py` — `ProfileInput` / `ScoredTask` / `RouteResult` / `Pathway`，按 api-design 重写
- `app/routers/analysis.py`
- `app/routers/profiles.py`
- `app/routers/pathways.py`
- `app/routers/catalog.py`
- `app/routers/signals.py` — 时间线 + `POST /api/signals`
- `app/routers/analysis.py` — `POST /api/analysis` + `POST /api/analysis/recompute`

## 演示证据

- `/openapi.json`
- `POST /api/analysis`（Aisyah + Fast）的完整响应
- Normal/Fast 两次调用，第一条路线不同的对比
- Swagger 里跑通 health → seed → analysis → pathways → signals
