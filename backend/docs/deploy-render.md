# 部署：前端 Vercel + 后端 Render

> 前端已经在 Vercel（`pivott.studio`）。后端不要放 Vercel，放 **Render**（或 Railway / Fly.io）更合适。
> 两者通过公网 URL 连接：Vercel 页面 → `https://pivott-api.onrender.com` → Supabase。

## 为什么不放 Vercel

Vercel 的 Python 是 Serverless 函数，不是常驻进程：

- FastAPI + SQLAlchemy 的连接池会在冷启动/多实例下反复建连，容易撞 Supabase 连接数上限；
- 有执行时长限制，Supabase 查询慢一点就可能超时；
- 本地 SQLite、后台任务、`python -m app.live sync` 都跑不了。

Render 的 **Web Service** 是常驻 `uvicorn` 进程，和本地启动方式一样，最省事。

## 方式 1：Blueprint（推荐，最少点击）

仓库里已经有 [render.yaml](../render.yaml)（在 `backend/render.yaml` 也有一份）：

1. 用 GitHub 登录 <https://dashboard.render.com/register>。
2. 点 **New → Blueprint**，连接仓库 `truffleloaf/SDC-Hack`。
3. **Blueprint Path** 填 `backend/render.yaml`（如果页面要求）。
4. Render 会让你填两个 secret：
   - `DATABASE_URL`：Supabase 的 **Session pooler** 连接串（见下）
   - `SUPABASE_ANON_KEY`：`sb_publishable_...`（或旧版 anon `eyJ...`）
5. 点 **Apply**，等 2–5 分钟。

## 方式 2：手动 New Web Service

1. **New → Web Service** → 连接 `truffleloaf/SDC-Hack`。
2. 填写：

   | 项 | 值 |
   |---|---|
   | Name | `pivott-api` |
   | Region | Singapore |
   | Branch | `main` |
   | Root Directory | `backend` |
   | Runtime | Python 3 |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
   | Instance Type | Free |

3. 在 **Environment Variables** 加：

   ```text
   PIVOTT_DATASET=demo
   ALLOW_DEMO_RESET=false
   CORS_ORIGINS=https://pivott.studio,https://www.pivott.studio
   SUPABASE_URL=https://hgqspcvuoggnqqxfimpn.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_...
   DATABASE_URL=postgresql+psycopg://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
   PYTHON_VERSION=3.12.6
   ```

   `DATABASE_URL` 就是本地 `.env` 里那一条（Session pooler，端口 5432）。不要提交到 GitHub。

4. **Create Web Service**，等 build 完成。
5. 打开 `https://<service-name>.onrender.com/api/health`，应返回 `6 / 31 / 15 / 20`。

## 部署完成后：改 Vercel 的前端 API 地址

1. 复制 Render 给你的 URL，例如 `https://pivott-api.onrender.com`。
2. 打开 Vercel → 项目 `pivott.studio` → **Settings → Environment Variables**。
3. 新增或修改：

   ```text
   NEXT_PUBLIC_API_BASE=https://pivott-api.onrender.com
   ```

   （如果前端代码里写死了 `http://127.0.0.1:8000`，要改成读这个变量。）
4. 回到 **Deployments**，点最新一次部署的 **Redeploy**。
5. 打开线上站点，用测试账号登录：

   ```text
   邮箱：pivott.smoke.20261023@gmail.com
   密码：PivottSmoke!2026
   ```

## 验证

```powershell
curl.exe https://pivott-api.onrender.com/api/health
curl.exe https://pivott-api.onrender.com/api/auth/config
# signInEnabled 应为 true
```

再用浏览器打开 `https://pivott-api.onrender.com/docs`，调 `POST /api/auth/signin`。

## 注意

- Render 免费实例 15 分钟无请求会休眠，第一次访问要等 30–60 秒；演示前先打开一次 `/api/health` 预热。
- `CORS_ORIGINS` 只列出真实前端域名；如果 Vercel 预览域名也要访问，把预览域名加进去，或临时用 `*`。
- `ALLOW_DEMO_RESET=false` 保持不变；打开会让 `POST /api/seed` 清空 `profiles`。
- 后端代码更新后，Render 会自动重新部署 `main`；Vercel 前端不会自动知道新的 API 地址，只有改 `NEXT_PUBLIC_API_BASE` 才需要 Redeploy。
