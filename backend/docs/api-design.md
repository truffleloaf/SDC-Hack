# Pivott API 设计（与前端 demo 对齐）

> **事实来源**：前端 demo 的 `app/api/*/route.ts` + `lib/api.ts` + `lib/engine.ts`。
> 当前 demo 的页面**直接调用 `lib/engine.ts` 在浏览器里算分**；`app/api/*` 是同一套逻辑的服务端镜像，字段和结果必须与页面一致。FastAPI 要替换的是这组 route handler，不是页面里的计算逻辑。
>
> **状态**：第 4 节的 10 个 demo 方法、2 个 live 方法（`/api/live/status`、`/api/live/jobs`）、10 个登录/个人数据方法（第 4.12–4.15 节）和第 5 节的 2 个演示控制端点都已在 FastAPI 实现（`app/routers/*`），并与前端 route handlers 的字段一致。前端页面仍可直接用 `lib/engine.ts` 本地算分。旧文档里的 `/api/meta`、`/api/demo`、`/api/admin/*` 等不在 demo 契约里，见第 8 节。

## 1. 通用约定

- JSON over HTTP；请求和响应都是 **camelCase**。
- **没有** `{data, meta, sources}` 包装；成功响应直接返回业务对象。
- 日期用 `YYYY-MM-DD`；时间戳用 ISO 8601。
- 0–1 的比例用小数（`0.764`），百分数只在前端展示时乘 100。
- 所有响应带 `Cache-Control: no-store`。
- 错误统一为 `{ "error": "..." }`，不返回堆栈。
- 目录/计算端点无鉴权、无 cookie；`/api/me/*` 用 `Authorization: Bearer <Supabase access_token>`，仍不用 cookie。demo 的目录数据是合成的。
- `POST /api/analysis`、`POST /api/pathways`、`POST /api/profiles` 的请求体都是同一个 `ProfileInput`。

## 2. ProfileInput

```jsonc
{
  "roleId": "finance-admin",
  "selections": [
    { "taskId": "fa-invoice", "share": 30 },
    { "taskId": "fa-recon", "share": 20 },
    { "taskId": "fa-exception", "share": 15 },
    { "taskId": "fa-reporting", "share": 15 },
    { "taskId": "fa-comms", "share": 10 },
    { "taskId": "fa-expense", "share": 10 }
  ],
  "skills": {
    "excel": 3, "erp": 3, "controls": 3, "stakeholder": 2,
    "analysis": 2, "writing": 2, "empathy": 2, "coordination": 2,
    "process": 1, "automation": 1, "bi": 1, "ai": 1,
    "stats": 1, "sql": 0, "python": 0
  },
  "scenario": "fast",
  "hoursPerWeek": 6,
  "freeOnly": false,
  "targetRoleId": "finance-systems-analyst"
}
```

校验与归一化（与 `parseProfile` 完全一致）：

| 字段 | 规则 |
|---|---|
| `roleId` | 必填，必须是已知角色；否则 400 `Unknown roleId` |
| `selections` | 数组；非对象项丢弃；未知 `taskId` 丢弃；`share` clamp 到 0–100；最多保留 20 条；计算时按总和归一化为分数（0–1） |
| `skills` | 只保留 15 个已知 skill id；值四舍五入并 clamp 到 0–4；不传视为 0 |
| `scenario` | 只接受 `"fast"`；其他值一律按 `"normal"` |
| `hoursPerWeek` | 默认 6；四舍五入并 clamp 到 1–40（UI 滑块是 2–20） |
| `freeOnly` | 只有 `true` 才生效 |
| `targetRoleId` | 可选；必须是已知角色，否则忽略（pathway 端点随后返回 400） |
| `name` | **不在 API 里**；姓名只存在浏览器 localStorage |

> 自定义任务（`custom-*`）不会通过 API 计算：`parseProfile` 会把未知 `taskId` 过滤掉。自定义任务只在浏览器本地生效。

## 3. 端点总览

| # | 方法 | 路径 | 用途 | 对应页面 | 现状 |
|---:|---|---|---|---|---|
| 1 | GET | `/api/health` | 健康检查、seed 版本、数量 | 全局 | Next 已实现 |
| 2 | GET | `/api/seed` | 返回完整 seed 数据 | landing / start / skills | Next 已实现 |
| 3 | POST | `/api/seed` | 重置 demo（清空用户信号） | signals / 演示后 | Next 已实现 |
| 4 | POST | `/api/profiles` | 校验并回显 profile | start → skills | Next 已实现 |
| 5 | POST | `/api/analysis` | 任务地图 + 技能 + 路线 | map / routes | Next 已实现 |
| 6 | POST | `/api/pathways` | 生成学习路径（不落库） | pathway | Next 已实现 |
| 7 | GET | `/api/pathways/{id}` | 按 id 重算路径 | pathway 刷新 | Next 已实现 |
| 8 | GET | `/api/roles/{id}/tasks` | 某角色的评分任务 | start / map 的只读镜像 | Next 已实现 |
| 9 | GET | `/api/signals` | 信号时间线 | signals | Next 已实现 |
| 10 | GET | `/api/sdgs` | 4 个 SDG 及角色映射 | routes / passport | Next 已实现 |
| 11 | POST | `/api/signals` | 新增用户信号 | signals → Admin | **待后端接管** |
| 12 | POST | `/api/analysis/recompute` | 应用新信号并返回 diff | signals → Recompute | **待后端接管** |
| 13 | GET | `/api/live/status` | live 数据来源、许可、demand 方法、计数 | 运维 / 演示 | FastAPI 已实现 |
| 14 | GET | `/api/live/jobs` | 支撑 demand 的真实在招职位 | 未来 live 页面 | FastAPI 已实现 |
| 15 | GET | `/api/auth/config` | 公开的 Supabase URL / anon key | sign-in | FastAPI 已实现 |
| 16 | GET | `/api/auth/me` | 校验 token，返回当前用户 | sign-in / 头部 | FastAPI 已实现 |
| 17 | GET | `/api/me/profile` | 当前用户保存的 profile | start / pathway / passport | FastAPI 已实现 |
| 18 | PUT | `/api/me/profile` | 保存/替换 profile + 进度 + 自定义信号 | start / pathway / signals | FastAPI 已实现 |
| 19 | DELETE | `/api/me/profile` | 删除当前用户 profile | Delete my data | FastAPI 已实现 |
| 20 | POST | `/api/auth/signin` | UI-only 前端登录桥（邮箱密码 → Supabase session） | sign-in | FastAPI 已实现 |
| 21 | POST | `/api/auth/signup` | 注册；邮箱确认开启时只发邮件 | sign-in / sign-up | FastAPI 已实现 |
| 22 | POST | `/api/auth/refresh` | refresh token → 新 access token | session 刷新 | FastAPI 已实现 |
| 23 | POST | `/api/auth/signout` | 注销（幂等） | 退出登录 | FastAPI 已实现 |
| 24 | POST | `/api/auth/password/reset` | 发送重置密码邮件 | forgot password | FastAPI 已实现 |

## 4. 核心端点

### 4.1 `GET /api/health`

```json
{
  "status": "ok",
  "dataset": "demo",
  "seedVersion": "2026.10.1",
  "dataAsOf": "2026-10-01",
  "counts": { "roles": 6, "tasks": 31, "skills": 15, "signals": 20 }
}
```

`dataset` 是进程的 `PIVOTT_DATASET`（`demo` / `live`）；live 的 `seedVersion` / `dataAsOf` 来自该库的 `meta`。

### 4.2 `GET /api/seed`

返回完整、带版本的数据集：

```jsonc
{
  "version": "2026.10.1",
  "asOf": "2026-10-01",
  "roles": [ /* 6 */ ],
  "tasks": [ /* 31 */ ],
  "skills": [ /* 15 */ ],
  "signals": [ /* 20，含 evidence */ ],
  "resources": [ /* 24 */ ],
  "scenarios": [ /* 2 */ ],
  "sdgs": [ /* 4 */ ],
  "demoPersona": {
    "name": "Aisyah",
    "roleId": "finance-admin",
    "skills": { "excel": 3, "erp": 3, "sql": 0, "python": 0 }
  }
}
```

`POST /api/seed` 重置 demo（仅 `PIVOTT_DATASET=demo`；live 恒 403）：

```json
{ "reset": true, "version": "2026.10.1", "demoPersona": { "name": "Aisyah", "roleId": "finance-admin", "skills": {} } }
```

live 的 `GET /api/seed` 返回同样的目录结构，但 `demoPersona` 是 `null`。

### 4.3 `POST /api/profiles`

请求：`ProfileInput`。响应 `201`：

```json
{
  "id": "eyJyb2xlSWQiOiJmaW5hbmNlLWFkbWluIiwic2VsZWN0aW9ucyI6W119",
  "profile": { /* 归一化后的 ProfileInput */ },
  "storage": "client"
}
```

`id` 是 `base64url(JSON(profile))`，只用于回显/分享；服务端不持久化。demo 的 profile 永远在浏览器 localStorage。

### 4.4 `POST /api/analysis`

请求：`ProfileInput`（Aisyah + `scenario=fast`）。响应 `200`：

```jsonc
{
  "scenario": "fast",
  "roleExposure": 0.764,
  "confidence": "Medium",
  "tasks": [
    {
      "id": "fa-invoice",
      "name": "Invoice entry",
      "description": "Capture supplier invoices and code them to the ledger.",
      "share": 0.3,
      "baseExposure": 0.78,
      "adjustment": 0.0418,
      "exposure": 1,
      "humanJudgment": 0.15,
      "classification": "Automate",
      "skills": ["erp", "excel"],
      "tryThisWeek": "Batch ten invoices through your ERP’s capture feature and log every field you had to correct.",
      "custom": false
    }
    // ... 其余 5 个任务
  ],
  "routes": [
    {
      "roleId": "finance-systems-analyst",
      "title": "Finance Systems Analyst",
      "family": "Finance & Technology",
      "demand": 78,
      "coverage": 0.5868,
      "similarity": 0.4545,
      "fit": 56.0,
      "targetExposure": 0.4576,
      "score": 55.5,
      "gaps": [
        { "skillId": "automation", "name": "Process automation", "current": 1, "required": 3, "gap": 2, "importance": 4, "priority": 6.24, "hours": 24 },
        { "skillId": "process", "name": "Process design", "current": 1, "required": 3, "gap": 2, "importance": 3, "priority": 4.68, "hours": 20 },
        { "skillId": "sql", "name": "SQL", "current": 0, "required": 2, "gap": 2, "importance": 3, "priority": 4.68, "hours": 24 },
        { "skillId": "erp", "name": "ERP systems", "current": 3, "required": 4, "gap": 1, "importance": 5, "priority": 3.9, "hours": 14 },
        { "skillId": "stakeholder", "name": "Stakeholder communication", "current": 2, "required": 3, "gap": 1, "importance": 3, "priority": 2.34, "hours": 8 }
      ],
      "totalGapHours": 90,
      "weeks": 15,
      "sdgs": [8, 9]
    }
    // ... 共 3 条路线，按 score 降序
  ],
  "illustrative": true
}
```

说明：

- `tasks` 只包含 `selections` 里出现过的任务，`share` 已归一化为 0–1。
- `routes` 固定返回 3 条（`computeRoutes` 默认 limit=3），按 `score` 降序。
- `confidence` 由任务覆盖率和 verified 信号权重决定，不是模型置信度。
- `roleExposure` 是时长加权暴露度，不是失业概率。
- 同一请求重复调用，结果完全一致。

### 4.5 `POST /api/pathways`

请求：`ProfileInput`，必须带 `targetRoleId`。响应 `201`：

```jsonc
{
  "id": "eyJ0YXJnZXRSb2xlSWQiOiJmaW5hbmNlLXN5c3RlbXMtYW5hbHlzdCIsImxldmVscyI6eyJleGNlbCI6MywiZXJwIjozLCJjb250cm9scyI6Mywic3Rha2Vob2xkZXIiOjIsImFuYWx5c2lzIjoyLCJ3cml0aW5nIjoyLCJlbXBhdGh5IjoyLCJjb29yZGluYXRpb24iOjIsInByb2Nlc3MiOjEsImF1dG9tYXRpb24iOjEsImJpIjoxLCJhaSI6MSwic3RhdHMiOjEsInNxbCI6MCwicHl0aG9uIjowfSwiaG91cnNQZXJXZWVrIjo2LCJmcmVlT25seSI6ZmFsc2V9",
  "targetRoleId": "finance-systems-analyst",
  "levels": { "excel": 3, "erp": 3, "sql": 0, "python": 0 },
  "hoursPerWeek": 6,
  "freeOnly": false,
  "steps": [
    {
      "id": "finance-systems-analyst:automation",
      "skillId": "automation",
      "title": "Level up: Process automation",
      "skills": ["automation"],
      "resource": { "title": "Power Automate training", "provider": "Microsoft Learn", "url": "https://learn.microsoft.com/en-us/training/powerplatform/power-automate", "free": true },
      "hours": 24,
      "startWeek": 1,
      "endWeek": 4,
      "deliverable": "An approval flow that routes invoices automatically",
      "why": "Building automations positions you as the person who designs the work."
    }
    // ... 共 5 步，按 gap priority 排序
  ],
  "totalHours": 90,
  "weeks": 15
}
```

规则：

- 步骤顺序 = `gap_priority` 降序（同 priority 按技能名）。
- `freeOnly=true` 时优先选该技能第一个免费资源；找不到免费资源时 `resource = null`。
- `weeks = ceil(totalHours / hoursPerWeek)`；6h → 15 周，8h → 12 周，12h → 8 周。
- 路径**不落库**；同一个 `id` 表示同一组输入，`GET` 时重新计算。
- `id` 不合法或 `targetRoleId` 缺失 → `400 targetRoleId is required` 或 `404 Pathway not found`。

### 4.6 `GET /api/pathways/{id}`

`id` 是 base64url 的 JSON（`targetRoleId` / `levels` / `hoursPerWeek` / `freeOnly`）。响应与 4.5 相同；无法解码或缺 `targetRoleId` 时返回 `404 { "error": "Pathway not found" }`。

### 4.7 `GET /api/roles/{id}/tasks?scenario=normal|fast`

返回某个角色的默认时间占比评分。用于 start/map 的只读校验，不替代 `POST /api/analysis`。

```jsonc
{
  "role": {
    "id": "finance-admin",
    "title": "Finance Admin",
    "family": "Finance",
    "demand": 55,
    "sdgs": [8],
    "requirements": [ /* 5 条 */ ]
  },
  "scenario": "normal",
  "roleExposure": 0.619,
  "tasks": [ /* ScoredTask[]，6 条，share 为 defaultShare/100 */ ]
}
```

未知角色 → `404 { "error": "Role not found" }`。`scenario` 只有 `fast` 才切换，其他值按 `normal`。

### 4.8 `GET /api/signals`

```jsonc
{
  "asOf": "2026-10-01",
  "count": 20,
  "signals": [
    {
      "id": "s01",
      "date": "2026-09-18",
      "headline": "Invoice-capture agents reach general availability in major ERPs",
      "sourceName": "SAP Business AI",
      "sourceUrl": "https://www.sap.com/products/artificial-intelligence.html",
      "direction": 1,
      "strength": 0.7,
      "impacts": [
        { "taskId": "fa-invoice", "impact": 0.045 },
        { "taskId": "oc-tracking", "impact": 0.04 }
      ],
      "explanation": "Line-item extraction now ships inside core finance modules.",
      "evidence": "illustrative",
      "recency": 0.9514
    }
  ]
}
```

- 按 `date` 降序。
- `recency = 0.5 ^ (ageDays / 180)`，`asOf` 固定为 `DATA_AS_OF`。
- 没有分页；20 条 seed + 用户信号一次返回。
- 用户新增信号（`evidence: "user"`）存在 `signals` 表；`GET` 包含它们并按同样规则排序，`POST /api/analysis` 默认不应用，直到 `recompute`。

### 4.9 `GET /api/sdgs`

```json
{
  "sdgs": [
    { "id": 4, "name": "Quality Education", "color": "#C5192D", "roles": [] },
    { "id": 8, "name": "Decent Work and Economic Growth", "color": "#A21942", "roles": ["finance-admin", "finance-systems-analyst", "data-analyst", "marketing-executive", "customer-support-specialist", "operations-coordinator"] },
    { "id": 9, "name": "Industry, Innovation and Infrastructure", "color": "#FD6925", "roles": ["finance-systems-analyst", "data-analyst", "operations-coordinator"] },
    { "id": 10, "name": "Reduced Inequalities", "color": "#DD1367", "roles": ["customer-support-specialist"] }
  ]
}
```

`roles` 是 `role.sdgs` 的反向索引；demo 没有 skill → SDG 映射。

### 4.10 `GET /api/live/status`

只读。返回 live 库的导入来源、O*NET 版本/许可、demand 方法（Arbeitnow 匹配或 Adzuna 计数）、
`model.exposure` 版本号和当前行数。demo 进程返回 `imported: false`，其余字段仍是 demo 计数。

```jsonc
{
  "dataset": "live",
  "imported": true,
  "seedVersion": "onet-31.0+arbeitnow-2026-10-23",
  "dataAsOf": "2026-10-23",
  "counts": { "roles": 10, "tasks": 60, "skills": 17, "signals": 0, "postings": 85 },
  "catalog": { "name": "O*NET 31.0 Database", "license": "CC BY 4.0", "release": "2026-08" },
  "demand": { "name": "Arbeitnow job board", "status": "live", "matched": 188 },
  "model": { "exposure": "pivott-onet-cues-v1" }
}
```

### 4.11 `GET /api/live/jobs?roleId=&limit=`

返回 `job_postings` 里支撑该角色 demand 的真实职位，按发布日期倒序。
`limit` 1–100（默认 20）；未知 `roleId` 返回 404。demo 库返回 `count: 0`。

```jsonc
{
  "dataset": "live",
  "asOf": "2026-10-23",
  "count": 6,
  "postings": [
    {
      "id": "vollzeit-buchhalter-in-m-w-d-remote-123",
      "roleId": "bookkeeping-clerk",
      "title": "Vollzeit Buchhalter*in (m/w/d) Remote",
      "company": "Simplyright GmbH",
      "location": "Berlin",
      "url": "https://www.arbeitnow.com/view/...",
      "postedAt": "2026-10-22",
      "remote": true,
      "tags": ["Accounting"],
      "matchedTitle": "buchhalter"
    }
  ]
}
```

### 4.12 `GET /api/auth/config`

公开的 Supabase 登录配置；前端用它初始化 `@supabase/supabase-js`，不需要把 anon key 写进前端仓库。

```json
{
  "url": "https://hgqspcvuoggnqqxfimpn.supabase.co",
  "anonKey": "eyJhbGciOi...",
  "authEnabled": true,
  "signInEnabled": true
}
```

- `anonKey` 是 publishable/anon key，可公开；没配时为 `null`。
- `authEnabled=false` 表示后端没配 `SUPABASE_URL`（也无法推断），受保护端点返回 503。
- `signInEnabled=false` 表示还缺 `SUPABASE_ANON_KEY`，前端暂时无法完成真正的登录。

### 4.13 `GET /api/auth/me`

```http
Authorization: Bearer <access_token>
```

返回 Supabase 校验过的用户：

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "email": "aisyah@example.com",
  "role": "authenticated",
  "provider": "email",
  "expiresAt": "2026-10-23T04:15:00Z"
}
```

- 没带 header → `401 {"error": "Missing bearer token"}`。
- 过期/签名错误/不是用户 token → `401 {"error": "..."}`。
- 后端没配 Supabase → `503 {"error": "Supabase Auth is not configured"}`。
- 401 带 `WWW-Authenticate: Bearer`。

### 4.14 `GET/PUT/DELETE /api/me/profile`

都需要 `Authorization: Bearer <access_token>`，用户由 token 的 `sub` 决定，请求体里没有 `profile_id`。

`PUT` 请求体 = `ProfileInput` + `name` / `completedSteps` / `customTasks` / `customSignals`：

```json
{
  "roleId": "finance-admin",
  "selections": [{ "taskId": "fa-invoice", "share": 30 }],
  "skills": { "excel": 3, "erp": 3 },
  "scenario": "normal",
  "hoursPerWeek": 6,
  "freeOnly": false,
  "targetRoleId": "finance-systems-analyst",
  "name": "Aisyah",
  "completedSteps": ["sql-1"],
  "customTasks": [],
  "customSignals": [{ "id": "sig-1", "headline": "Custom signal" }]
}
```

响应：

```json
{
  "userId": "11111111-1111-1111-1111-111111111111",
  "email": "aisyah@example.com",
  "name": "Aisyah",
  "roleId": "finance-admin",
  "selections": [{ "taskId": "fa-invoice", "share": 30.0 }],
  "skills": { "excel": 3, "erp": 3 },
  "scenario": "normal",
  "hoursPerWeek": 6,
  "freeOnly": false,
  "targetRoleId": "finance-systems-analyst",
  "completedSteps": ["sql-1"],
  "customTasks": [],
  "customSignals": [{ "id": "sig-1", "headline": "Custom signal" }],
  "storage": "server",
  "createdAt": "2026-10-23T03:00:00Z",
  "updatedAt": "2026-10-23T03:00:00Z"
}
```

- `GET` 没有保存过 → `404 {"error": "Profile not found"}`。
- `PUT` 是整行替换，`createdAt` 不变；未知 task/skill 静默过滤，share/level/hours 夹紧，未知 role 返回 400。
- `DELETE` 返回 `{ "deleted": true|false }`，可重复调用。
- 数据量上限：`completedSteps` 200 条，`customTasks` 50 条，`customSignals` 100 条，每条 ≤ 4 KB，总计 ≤ 32 KB。

### 4.15 登录桥（可选，给 UI-only 前端）

推荐前端用 `@supabase/supabase-js` 直连 Supabase；如果前端暂时只有 UI，可以调这组端点。FastAPI 把邮箱密码原样转发给 GoTrue 一次，**不落库、不记日志**，返回 camelCase session。需要 `SUPABASE_URL` + `SUPABASE_ANON_KEY`，否则 503。

`POST /api/auth/signin`：

```json
{ "email": "aisyah@example.com", "password": "secret-123" }
```

成功 200：

```json
{
  "accessToken": "<supabase access token>",
  "refreshToken": "<refresh token>",
  "tokenType": "bearer",
  "expiresIn": 3600,
  "user": {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "aisyah@example.com",
    "role": "authenticated",
    "provider": "email",
    "emailConfirmed": true
  }
}
```

其余端点：

| 方法 | 路径 | 请求 | 成功返回 |
|---|---|---|---|
| POST | `/api/auth/signup` | `{email, password}` | 201 `{needsEmailConfirmation, user, session}` |
| POST | `/api/auth/refresh` | `{refreshToken}` | 200 同 signin |
| POST | `/api/auth/signout` | 可选 `Authorization: Bearer <token>` | 200 `{signedOut: true}` |
| POST | `/api/auth/password/reset` | `{email}` | 200 `{sent: true}` |

错误：

| 场景 | 状态码 | `error` |
|---|---|---|
| 邮箱/密码错误 | 401 | `Invalid email or password` |
| 邮箱未确认 | 403 | `Email not confirmed` |
| 账号被禁 | 403 | `Account is unavailable` |
| 已注册 | 409 | `Email already registered` |
| 尝试过多 | 429 | `Too many attempts; try again later` |
| 缺 URL / anon key | 503 | `Supabase Auth is not configured` |
| GoTrue 不可用 | 503 | `Supabase Auth is unavailable` |

`password/reset` 对不存在的邮箱也返回 `sent: true`，避免账号枚举。

## 5. 演示控制端点（已实现）

前端 signals 页面已经实现“Admin 加信号 → Recompute → 高亮变化”的体验；FastAPI 也提供同一组契约，方便后端接管。用户信号写入 `signals` 表，`POST /api/analysis` 默认不应用它们，`recompute` 才把它们加入计算。请求/响应字段能直接驱动现有 UI。

### 5.1 `POST /api/signals`

新增一条 `evidence = "user"` 的信号。请求：

```json
{
  "date": "2026-09-30",
  "headline": "A new invoice agent reaches finance teams",
  "sourceName": "Demo source",
  "sourceUrl": "https://example.org/signal",
  "direction": 1,
  "strength": 0.6,
  "impacts": [{ "taskId": "fa-invoice", "impact": 0.15 }],
  "explanation": "Synthetic demo signal."
}
```

校验：`date <= 2026-10-01`；`headline` 8–140 字符；`sourceName` 1–60；`sourceUrl` 完整 `https://`；`direction` ±1；`strength` 0.1–1；`impact` 0.05–0.4；至少 1 个已知 `taskId`。

响应 `201`：完整 Signal（含 `id: "user-*"`、`evidence: "user"`、`recency`）。信号写入数据库，但在 `recompute` 前不参与 `POST /api/analysis`。

### 5.2 `POST /api/analysis/recompute`

应用 pending 信号并返回 diff。请求：

```json
{
  "profile": { /* ProfileInput */ },
  "pendingSignalIds": ["user-abc"]
}
```

响应：

```json
{
  "before": { "roleExposure": 0.619, "tasks": [ /* ScoredTask[] */ ] },
  "after":  { "roleExposure": 0.646, "tasks": [ /* ScoredTask[] */ ] },
  "delta": 0.027,
  "changed": [
    { "taskId": "fa-invoice", "name": "Invoice entry", "before": 0.822, "after": 0.911 }
  ]
}
```

`changed` 只包含 `|after − before| > 0.0005` 的任务；前端用它做 7 秒高亮。无变化时返回空数组，仍返回 200。

### 5.3 `POST /api/seed` / 隐私

- `POST /api/seed`：仅 demo 数据集可用（live 恒 403）；清空用户信号、回到 20 条 seed，返回 `{ "reset": true, "version": "2026.10.1", "demoPersona": {...} }`。
- 未登录的 “Delete my data” 仍是浏览器 `localStorage.removeItem`；登录用户用 `DELETE /api/me/profile`，删除 Supabase Auth 用户会级联删除 `profiles`。
- `POST /api/seed` 在 PostgreSQL 上 `TRUNCATE` 所有表（包括 `profiles`），会清掉已保存的用户数据；`ALLOW_DEMO_RESET=false` 时返回 403。
- 旧文档的 `POST /api/admin/seed` 不在 demo 契约里；统一用 `POST /api/seed`。

## 6. 页面 → 数据

| 页面 | 需要的数据 | 首选端点 |
|---|---|---|
| `/` Landing | 演示任务图、seed 版本 | `GET /api/seed`（或构建时静态） |
| `/example` | Aisyah demo persona | `GET /api/seed` → `demoPersona` |
| `/start` | 6 个角色、31 个任务、默认 share | `GET /api/seed` |
| `/skills` | 15 个技能、4 个类别、自评 0–4 | `GET /api/seed` |
| `/map` | `tasks[]` + `roleExposure` + `confidence` | `POST /api/analysis` |
| `/routes` | `routes[]` + gaps + SDG | `POST /api/analysis` |
| `/pathway` | steps + resource + hours + weeks | `POST /api/pathways`；进度本地或 `PUT /api/me/profile` |
| `/passport` | 最近路线 fit + steps + stays | `POST /api/analysis` + `POST /api/pathways` |
| `/signals` | 20 条 seed + 用户信号 + recency | `GET /api/signals`；新增/重算见第 5 节 |
| sign-in | Supabase 配置、当前用户 | `GET /api/auth/config` + `@supabase/supabase-js`，或 `POST /api/auth/signin` + `GET /api/auth/me` |
| 已登录个人数据 | profile、进度、自定义信号 | `GET/PUT/DELETE /api/me/profile` |

## 7. 错误

| 场景 | 状态码 | Body |
|---|---|---|
| JSON 不是对象 | 400 | `{ "error": "Body must be a JSON object" }` |
| JSON 语法错误 | 400 | `{ "error": "Invalid request body: malformed JSON" }` |
| 字段类型错误 | 400 | `{ "error": "Invalid request: roleId: Input should be a valid string" }` |
| `roleId` 未知 | 400 | `{ "error": "Unknown roleId" }` |
| pathway 缺目标角色 | 400 | `{ "error": "targetRoleId is required" }` |
| 角色不存在 | 404 | `{ "error": "Role not found" }` |
| pathway id 无效 | 404 | `{ "error": "Pathway not found" }` |
| 没带 token | 401 | `{ "error": "Missing bearer token" }` |
| token 过期/签名不对 | 401 | `{ "error": "Token expired" }` / `"Invalid token"` |
| 没配 Supabase Auth | 503 | `{ "error": "Supabase Auth is not configured" }` |
| JWKS 拉不到 | 503 | `{ "error": "Supabase Auth keys are unavailable" }` |
| 邮箱未确认 | 403 | `{ "error": "Email not confirmed" }` |
| 邮箱已注册 | 409 | `{ "error": "Email already registered" }` |
| 登录尝试过多 | 429 | `{ "error": "Too many attempts; try again later" }` |
| 用户还没保存 profile | 404 | `{ "error": "Profile not found" }` |
| 数据库/上游不可用 | 503 | `{ "error": "service unavailable" }` |
| 未捕获异常 | 500 | `{ "error": "Internal Server Error" }`（堆栈只写日志） |

错误统一在 `app/errors.py` 生成：`StarletteHTTPException`（业务 4xx）、`RequestValidationError`（请求体校验，统一 400）、`ProfileError`（profile 校验 400）、SQLAlchemy 连接异常（503）、`Exception`（兜底 500）。handler 会保留 `Allow`、`WWW-Authenticate` 等协议头；500 由 CORS 内层的中间件生成，所以跨域响应同样带 `Access-Control-Allow-Origin`，浏览器能读到错误体。

demo 不使用 422。`parseProfile` 对非法 `selections` / `skills` 是**静默过滤**，只有 `roleId` 错误才 400——这是当前行为，前端依赖它。

## 8. 旧接口的处理

| 旧接口 | 处理 |
|---|---|
| `GET /api/meta` | 删除；版本和 `asOf` 在 `/api/health`、`/api/seed` 里 |
| `GET /api/demo` / `GET /api/analysis/demo` | 删除；用 `/api/seed` 的 `demoPersona` + `POST /api/analysis` |
| `GET /api/skills`、`GET /api/skills/{id}/sdgs` | 删除；技能和 SDG 由 `/api/seed` / `/api/sdgs` 提供，且没有 skill→SDG |
| `GET /api/scenarios` | 删除；`/api/seed` 已含 2 个情景 |
| `GET /api/profiles`、`GET /api/profiles/{id}` | 删除；登录用户的数据在 `GET /api/me/profile` |
| `POST /api/analysis`（`profile_id` + `scenario_id`） | 改为内联 `ProfileInput`（第 2 节） |
| `POST /api/pathways/preview` | 删除；`POST /api/pathways` 本身不落库 |
| `PATCH /api/pathways/steps/{id}` | 删除；进度存 `completedSteps`（本地或 profile 表） |
| `GET /api/signals/{id}` | 删除；列表已返回完整对象 |
| `POST /api/admin/signals` | 改为 `POST /api/signals`（第 5.1 节） |
| `POST /api/admin/recompute` | 改为 `POST /api/analysis/recompute`，必须带 diff（第 5.2 节） |
| `POST /api/admin/seed` | 改为 `POST /api/seed` |
| `DELETE /api/profiles/{id}` | 改为 `DELETE /api/me/profile`（用户由 token 决定，路径里没有 id） |

## 9. 验收清单

- [ ] `/api/health` 的 `dataset` = `demo` / `live`，counts = 6 / 31 / 15 / 20（demo）。
- [ ] `/api/seed` 返回 6 roles、31 tasks、15 skills、20 signals、24 resources、2 scenarios、4 sdgs。
- [ ] Aisyah + Normal 的 `roleExposure` = 0.619（显示 62%）；Fast = 0.764。
- [ ] Normal 的 `routes[0].roleId = operations-coordinator`；Fast 的 `routes[0].roleId = finance-systems-analyst`。
- [ ] FSA 路线 `fit = 56.0`、`targetExposure = 0.4576`、`score = 55.5`、`weeks = 15`。
- [ ] FSA 路径 5 步、`totalHours = 90`；`hoursPerWeek = 8` 时 12 周，`12` 时 8 周。
- [ ] 同一输入连续调用两次，响应逐位一致。
- [ ] `/api/auth/me`、`/api/me/profile` 不带 token 返回 401；带合法 Supabase token 返回当前用户/自己的 profile。
- [ ] 用户 A 保存的 profile 对用户 B 不可见（token `sub` 过滤 + `profiles` RLS）。
- [ ] `/api/auth/config` 的 `signInEnabled` 与实际 `SUPABASE_ANON_KEY` 配置一致。
- [ ] `/api/auth/signin` 在未配 anon key 时 503；错误密码 401；成功后返回 `accessToken`；`/api/auth/signout` 幂等。
- [ ] 所有响应无 `{data, meta}` 包装；错误只有 `{error}`。
- [ ] 响应和页面都不出现“失业概率”。
