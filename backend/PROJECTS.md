# Pivott 后端：构建说明与当前状态

> 这份文件描述 **`backend/` 里已经实现的东西**，不再是最初的计划稿。
> 最初那份“6 个工作包 + Supabase 17 表”的计划已经作废；现在以 repo 里前端的数据和 API 契约为准。

## 1. 结论

- `backend/` 是前端 Next.js API 的 **1:1 FastAPI 端口**。
- 数据：**6 角色 / 31 任务 / 15 技能 / 20 信号 / 4 SDG / 24 资源 / 2 情景 / Aisyah**。
- **10 个 `/api` 端点**，`/docs` 可以完整走通。
- **31 个测试通过**，其中包含与前端 `lib/engine.ts` 的 golden 输出对拍。
- 无 LLM、无数据库、无登录；和前端 API 一样是**无状态**的。
- 根目录 `README.md` 和 `pivott-web-application-design/` **没有改动**。

## 2. 为什么采用无状态

前端 `pivott-web-application-design/app/api/*` 本身就是无状态的：

- `POST /api/profiles` 只校验并回显 profile；
- pathway 的 id 是把输入编码成 base64url，读的时候再解出来；
- 浏览器把 profile 和进度存在 localStorage。

如果后端加数据库或登录，反而和现有契约不一致。评委要看的后端能力——**数据、公式、契约、测试、可解释性**——都已经在这套实现里。

## 3. 已实现

| 文件 | 作用 |
|---|---|
| `app/seed.py` | 加载 `app/data/seed.json`，建立 role/skill/task 索引 |
| `app/engine.py` | 前端 `lib/engine.ts` 的逐函数 Python 移植 |
| `app/parsing.py` | 前端 `lib/api.ts` 的校验 + base64url id |
| `app/routers/health.py` | `/api/health` |
| `app/routers/seed.py` | `GET/POST /api/seed` |
| `app/routers/profiles.py` | `POST /api/profiles` |
| `app/routers/analysis.py` | `POST /api/analysis` |
| `app/routers/pathways.py` | `POST /api/pathways`、`GET /api/pathways/{id}` |
| `app/routers/roles.py` | `GET /api/roles/{id}/tasks` |
| `app/routers/signals.py` | `GET /api/signals` |
| `app/routers/sdgs.py` | `GET /api/sdgs` |
| `tests/golden.json` | 从前端 engine 生成的 golden 输出 |
| `tests/test_engine.py` | 公式 + golden 对拍 |
| `tests/test_api.py` | HTTP 契约测试 |

## 4. 验证

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest -q
# 31 passed
```

Golden 对拍覆盖：

- Normal / Fast 的 task exposure、adjustment、classification、role exposure、confidence、route 排名；
- `finance-admin` 的任务地图；
- 付费 / free-only 两条 pathway 的 steps、hours、weeks、week 区间、resource。

## 5. 与最初计划的差异

| 最初计划 | 现在 |
|---|---|
| Supabase 17 张表 | 已删除；改用 repo 的 `seed.json`，无数据库 |
| 13 技能 / 17 SDG / 18 资源 | 以 repo 实际数据为准：**15 技能 / 4 SDG / 24 资源** |
| 旧 seed 16 技能 / 15 信号 | 替换为 repo 的 **15 技能 / 20 信号** |
| `role_tasks` + `profile_skills` 表 | 不再需要；采用 repo 的 `tasks.roleId` + JSON skills |
| 6 个 GitHub issue / 根 CI | 还没放进 repo；根目录改动需要单独 PR |

## 6. 可选后续

1. **Supabase persistence**：把 profile / pathway 进度落库。当前契约是无状态的，这是扩展，不是修 bug。
2. **根目录 CI**：在仓库根加 `.github/workflows/backend-tests.yml`，`working-directory: backend`。这是新增文件，不动 README/前端。
3. **Admin signal injection**：`POST /api/admin/signals` + recompute diff，用于现场演示“加信号→分数变化”。repo 前端目前没有这个 API，属于新增能力。
4. **部署**：Render / Railway / Fly.io 跑 `uvicorn app.main:app --host 0.0.0.0 --port $PORT`，CORS 收紧。
