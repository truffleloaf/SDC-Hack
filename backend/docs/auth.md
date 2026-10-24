# Supabase Auth 与用户数据

> 前端只做 UI，登录由 **Supabase Auth** 完成；后端做两件事：校验 access token，把登录用户的 profile 存进 Supabase。
> 推荐浏览器直连 Supabase；如果前端暂时只有 UI，也可以走 5.2 的后端桥，密码只在一次 HTTPS 请求中转发给 GoTrue，不落库、不记日志。

## 1. 分工

```text
浏览器 (sign-in UI)                Supabase Auth              FastAPI                      Supabase Postgres
      │                                 │                        │                               │
      ├── signInWithPassword ──────────▶│                        │                               │
      │◀──────────── access_token ──────┤                        │                               │
      │                                 │                        │                               │
      ├── Authorization: Bearer <token> ────────────────────────▶│                               │
      │                                 │                        ├── JWKS 公钥校验签名 ─────────▶│
      │                                 │                        ├── sub = auth.users.id         │
      │                                 │                        ├── GET/PUT /api/me/profile ───▶│ profiles
      │◀──────────── JSON ───────────────────────────────────────┤                               │
```

三条边界：

- 浏览器只拿 **URL + publishable/anon key**；service role key 永远不下发。
- FastAPI 用数据库 owner 连接（绕过 RLS），但每个 `/api/me/*` 查询都强制 `user_id = token.sub`。
- `profiles` 同时开 RLS：即使有人拿 anon key 直连 PostgREST，也只看得到自己的行。

## 2. 后端配置

`.env`（服务端，不要提交）：

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<publishable/anon key>
# 只有仍用 HS256 签名的老项目才需要：
# SUPABASE_JWT_SECRET=
# SUPABASE_JWKS_TTL_SECONDS=300
```

- `SUPABASE_URL` 省略时会从 `DATABASE_URL` 的 `postgres.<ref>@...` 或 `db.<ref>.supabase.co` 推断，所以同一个项目配好数据库后 Auth 通常不用再填 URL。
- `SUPABASE_ANON_KEY` 是 publishable/anon key：`GET /api/auth/config` 把它交给浏览器，5.2 的后端登录桥用它调 GoTrue。后端只校验 token 时**不需要**它；没配时 `signInEnabled = false`，两种登录方式都还不可用。
- `SUPABASE_JWT_SECRET` 是 legacy HS256 项目的回退；新项目用 ES256 + JWKS，不需要。

对应的代码：

| 文件 | 作用 |
|---|---|
| `app/auth.py` | JWKS 拉取/缓存、ES256/RS256（可选 HS256）校验、`get_current_user` 依赖 |
| `app/routers/auth.py` | `GET /api/auth/config`、`GET /api/auth/me`、`POST /api/auth/signin|signup|refresh|signout|password/reset` |
| `app/services/auth_gateway.py` | 可选登录桥：把邮箱密码转发给 GoTrue、映射错误，不落库 |
| `app/routers/me.py` | `GET/PUT/DELETE /api/me/profile` |
| `app/services/user_profile.py` | 归一化、清洗、upsert / delete |
| `app/models.py` → `Profile` | 一行一个用户；SQLite 本地自动建表 |
| `supabase/migrations/202610231200_profiles.sql` | Supabase 的 `profiles` 表、RLS、grant、updated_at trigger |

### 2.1 只差 publishable / anon key 时

当前项目 `hgqspcvuoggnqqxfimpn` 的 URL 和 JWKS 已经能用（`scripts/check_auth.py` 会显示 `alg=ES256`），唯一缺的是公开的 publishable/anon key。

> Supabase 新版把 `anon` 改名成 **Publishable key**（`sb_publishable_...`），旧项目仍是 **anon key**（`eyJ...`）。两个都能用，不要拿 `secret` / `service_role`。

**方法 1：Settings → API Keys（最直接）**

1. 打开 <https://supabase.com/dashboard/project/hgqspcvuoggnqqxfimpn/settings/api-keys>。
   注意新版 Dashboard **没有**单独的 “API” 页；入口是左下角齿轮 **Project Settings** → **API Keys**。
2. 复制 **Publishable key**（`sb_publishable_...`）；如果没有，切到 **Legacy API keys** 复制 **anon** key（`eyJ...`）。
3. 填进 `.env`，两种变量名任选一个：

   ```text
   SUPABASE_ANON_KEY=sb_publishable_...
   # 或
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

4. 检查：

   ```powershell
   .\.venv\Scripts\python.exe scripts\check_auth.py --require-signin
   ```

   应为 `publishable/anon key: set (...)`、`signInEnabled (browser/bridge): True`。
5. 重启 API，让新环境变量生效。

**方法 2：项目首页的 Connect 按钮**

打开 <https://supabase.com/dashboard/project/hgqspcvuoggnqqxfimpn?showConnect=true>，Connect 对话框会直接显示项目 URL 和 publishable key，可一键复制。

publishable/anon key 是设计上公开的密钥（RLS 保护数据），可以安全地交给浏览器；`secret` / `service_role` 绝对不要下发。

## 3. 数据库

在 Supabase SQL Editor 执行：

```text
supabase/migrations/202610231200_profiles.sql
```

表和策略：

```sql
profiles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null default '',
  role_id text not null references roles(id),
  scenario text not null default 'normal' check (scenario in ('normal','fast')),
  hours_per_week integer not null default 6 check (hours_per_week between 1 and 40),
  free_only boolean not null default false,
  target_role_id text references roles(id),
  selections jsonb not null default '[]',
  skills jsonb not null default '{}',
  completed_steps jsonb not null default '[]',
  custom_tasks jsonb not null default '[]',
  custom_signals jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

- 4 条 owner policy：`select` / `insert` / `update` / `delete`，条件都是 `auth.uid() = user_id`。
- `grant select, insert, update, delete on public.profiles to authenticated`；`anon` 没有任何 policy，读不到。
- 删除 Supabase Auth 用户会级联删除 profile。
- `POST /api/seed` 会清空 **所有** 表（包括 `profiles`）；当前 `.env` 的 `ALLOW_DEMO_RESET=false` 已关掉这个端点。演示环境要重置时请确认这是预期行为。

本地的 SQLite 没有 `auth` schema，所以 `profiles` 表由 `SQLModel.metadata.create_all` 建，**没有** `auth.users` 外键；Supabase 的 DDL 才有外键。

## 4. API

所有 `/api/me/*` 都需要：

```http
Authorization: Bearer <access_token>
```

### 4.1 `GET /api/auth/config`（公开）

```json
{
  "url": "https://hgqspcvuoggnqqxfimpn.supabase.co",
  "anonKey": "eyJhbGciOi...",
  "authEnabled": true,
  "signInEnabled": true
}
```

`anonKey` 为 `null` / `signInEnabled` 为 `false` 表示部署还没配 `SUPABASE_ANON_KEY`。

### 4.2 `GET /api/auth/me`

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "email": "aisyah@example.com",
  "role": "authenticated",
  "provider": "email",
  "expiresAt": "2026-10-23T04:15:00Z"
}
```

### 4.3 `GET /api/me/profile`

- 有保存：返回完整 profile（见 4.4）。
- 没保存：`404 {"error": "Profile not found"}`。

### 4.4 `PUT /api/me/profile`

请求体是 `ProfileInput` 加四个 UI 字段：

```json
{
  "roleId": "finance-admin",
  "selections": [
    { "taskId": "fa-invoice", "share": 30 },
    { "taskId": "fa-recon", "share": 20 }
  ],
  "skills": { "excel": 3, "erp": 3 },
  "scenario": "normal",
  "hoursPerWeek": 6,
  "freeOnly": false,
  "targetRoleId": "finance-systems-analyst",
  "name": "Aisyah",
  "completedSteps": ["sql-1"],
  "customTasks": [{ "id": "local-1", "name": "Custom task" }],
  "customSignals": [{ "id": "sig-1", "headline": "Custom signal" }]
}
```

返回保存后的完整对象，多了 `userId`、`email`、`createdAt`、`updatedAt`、`storage: "server"`。

行为：

- `roleId` 未知 → `400 {"error": "Unknown roleId"}`。
- 未知 task / skill 静默过滤，share 夹到 0–100，level 夹到 0–4，hours 夹到 1–40（与 `POST /api/profiles` 一致）。
- `name` 去空白，最多 80 字符；`completedSteps` 去重、最多 200 条。
- `customTasks` / `customSignals` 每条 ≤ 4 KB、总数 ≤ 32 KB，最多 50 / 100 条。
- 同一个用户再 PUT 是整行替换，`createdAt` 不变。

### 4.5 `DELETE /api/me/profile`

```json
{ "deleted": true }
```

没有行时返回 `{ "deleted": false }`，方便前端做幂等的 “Delete my data”。

### 4.6 错误

| 场景 | 状态码 | Body |
|---|---|---|
| 没带 token | 401 | `{"error": "Missing bearer token"}` |
| token 过期/签名不对/不是用户 token | 401 | `{"error": "Invalid token"}` / `"Token expired"` / `"A signed-in user is required"` |
| 没配 Supabase | 503 | `{"error": "Supabase Auth is not configured"}` |
| JWKS 拉不到 | 503 | `{"error": "Supabase Auth keys are unavailable"}` |
| profile 不存在 | 404 | `{"error": "Profile not found"}` |

401 响应带 `WWW-Authenticate: Bearer`。

## 5. 前端接入（二选一）

当前前端只有 UI，有两种接法：

- **方式 A（推荐）**：浏览器直连 Supabase（`@supabase/supabase-js`），后端只验 token。
- **方式 B（最快）**：前端调后端的 `/api/auth/signin` 等桥接端点，不引入 Supabase JS；密码只在一次 HTTPS 请求里转发给 GoTrue，不落库、不记日志。

两种方式拿到 `access_token` 后，`/api/auth/me` 和 `/api/me/profile` 的用法完全一样。

### 5.1 方式 A：浏览器直连 Supabase

需要加 `@supabase/supabase-js`：

```bash
pnpm add @supabase/supabase-js
```

```ts
import { createClient } from "@supabase/supabase-js";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

// 1) 从后端拿公开配置，避免把 anon key 写死在前端仓库
const config = await fetch(`${API}/api/auth/config`).then((r) => r.json());
if (!config.signInEnabled) {
  throw new Error("API 还没有配置 SUPABASE_ANON_KEY");
}
const supabase = createClient(config.url, config.anonKey);

// 2) 真正的 sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (error) throw error;
const token = data.session?.access_token;

// 3) 后端只认这个 header
const me = await fetch(`${API}/api/auth/me`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

// 4) 读取/保存 profile
const saved = await fetch(`${API}/api/me/profile`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (saved.status === 404) {
  // 第一次登录：把当前 localStorage 的 profile PUT 上去
  await fetch(`${API}/api/me/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profile),
  });
}

// 5) token 会过期；supabase-js 会刷新，但要把新 token 传给后端
supabase.auth.onAuthStateChange(async (_event, session) => {
  const next = session?.access_token;
  if (next) {
    // 更新内存里的 token，后续 fetch 用新的
  }
});
```

### 5.2 方式 B：调后端登录桥（UI-only 前端）

可以直接把 [`examples/auth-client.ts`](examples/auth-client.ts) 复制到前端（例如 `lib/auth-client.ts`），它封装了下面所有端点、token 存取和 404 处理：

```ts
import { createPivottAuth } from "@/lib/auth-client";

const auth = createPivottAuth({ apiBase: process.env.NEXT_PUBLIC_API_BASE });

await auth.signIn(email, password);
const user = await auth.me();
const profile = await auth.getProfile(); // 没有则 null
await auth.saveProfile(profilePayload);
await auth.signOut();
```

也可以手写 fetch。端点（都不需要先登录；`signin` / `refresh` 成功后返回 `access_token`）：

| 方法 | 路径 | 请求 | 返回 |
|---|---|---|---|
| POST | `/api/auth/signin` | `{email, password}` | `{accessToken, refreshToken, tokenType, expiresIn, user}` |
| POST | `/api/auth/signup` | `{email, password}` | `{needsEmailConfirmation, user, session?}` |
| POST | `/api/auth/refresh` | `{refreshToken}` | 同 signin |
| POST | `/api/auth/signout` | `Authorization: Bearer <token>`（可省） | `{signedOut: true}` |
| POST | `/api/auth/password/reset` | `{email}` | `{sent: true}`（不暴露邮箱是否存在） |

```ts
const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

const response = await fetch(`${API}/api/auth/signin`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!response.ok) {
  const problem = await response.json(); // { error: "Invalid email or password" }
  throw new Error(problem.error);
}
const session = await response.json();
const token = session.accessToken; // 后续 Authorization: Bearer <token>

// 注册（邮箱确认开启时不会返回 session）
const signup = await fetch(`${API}/api/auth/signup`, { ... }).then((r) => r.json());
if (signup.needsEmailConfirmation) {
  // 提示用户去邮箱点确认链接，再回来 signin
}
```

错误映射：

| 场景 | 状态码 | `error` |
|---|---|---|
| 邮箱或密码错误 | 401 | `Invalid email or password` |
| 邮箱未确认 | 403 | `Email not confirmed` |
| 已注册 | 409 | `Email already registered` |
| 尝试过多 | 429 | `Too many attempts; try again later` |
| 没配 URL / anon key | 503 | `Supabase Auth is not configured` |

注意：

- 这组端点需要 `SUPABASE_URL` + `SUPABASE_ANON_KEY`；密码只在 FastAPI 内存里转发，**不写数据库、不写日志**。
- 生产更推荐方式 A：浏览器直连 Supabase，FastAPI 完全不接触密码。
- 没有速率限制；公网部署前应在网关或 FastAPI 侧加一层（或直接用方式 A）。

### 5.3 两种方式共同的注意事项

- Supabase 默认开启邮箱确认。demo 想“注册后立即进入”要在 **Authentication → Providers → Email** 关掉 *Confirm email*；否则 `signUp` / `/api/auth/signup` 只发邮件、不返回 session。
- `PUT /api/me/profile` 是整行替换；自动保存请防抖，不要每次滑块变化都发。
- 方式 A 用 `supabase.auth.signOut()`；方式 B 用 `POST /api/auth/signout`（幂等）。两种都只清前端 token 即可。
- 分享给未登录用户的 demo 仍可用：目录和计算接口不要求 token。

## 6. 本地验证

先确认配置齐全（缺 anon key 会以非 0 退出）：

```powershell
.\.venv\Scripts\python.exe scripts\check_auth.py --require-signin
```

```powershell
# 1) 数据库表
.\.venv\Scripts\python.exe supabase\check_connection.py   # tables: 14, profiles 0

# 2) 公开配置
curl.exe http://127.0.0.1:8000/api/auth/config

# 3) 没 token 的受保护端点
curl.exe -i http://127.0.0.1:8000/api/auth/me            # 401

# 4) 登录后把 access_token 填进来
curl.exe -H "Authorization: Bearer <access_token>" http://127.0.0.1:8000/api/auth/me

# 5) 登录桥（需要 SUPABASE_ANON_KEY；没配时返回 503）
$body = '{"email":"you@example.com","password":"..."}'
curl.exe -X POST http://127.0.0.1:8000/api/auth/signin `
  -H "Content-Type: application/json" -d $body

# 6) 一条命令跑完整链路：signin -> me -> PUT/GET/DELETE profile -> signout
.\.venv\Scripts\python.exe scripts\smoke_auth.py --email you@example.com
# 还没有账号时（先在 Supabase 关掉 Confirm email）：
.\.venv\Scripts\python.exe scripts\smoke_auth.py --signup --email test@example.com
```

pytest 覆盖：ES256 校验、过期/aud/iss/role/sub、未知 kid、篡改、HS256、`/api/auth/me`、`/api/me/profile` CRUD、用户隔离、越界清洗，以及登录桥的成功/错误映射（85 passed）。`scripts/verify_pg.py` 在真实 PostgreSQL 上验证 migration、4 条 RLS policy 和跨用户隔离。

## 7. 安全清单

- [ ] `SUPABASE_ANON_KEY` 是 **publishable/anon** key，不是 service role key
- [ ] `.env` 不进 git；service role key 不写进任何前端变量
- [ ] `CORS_ORIGINS` 只列真实前端域名（`Authorization` header 已允许）
- [ ] `ALLOW_DEMO_RESET=false`，或确认 reset 会清掉 profiles
- [ ] Supabase 的 RLS 保持开启；不要把 `profiles` 的 policy 改成 `using (true)`
- [ ] 后端仍用 owner 连接；如果改成 anon/authenticated 连接，必须让每个查询受 RLS 约束
- [ ] 如果启用 5.2 登录桥：日志里确认没有请求体；公网部署前加速率限制（或改用方式 A 直连 Supabase）
