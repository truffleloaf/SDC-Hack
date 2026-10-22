# 验证清单

> 这份文档是给评委和队友的“怎么证明它真的能跑”。

## 1. 环境

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2. 测试

```powershell
pytest -q
```

预期：

```text
31 passed
```

测试分两类：

| 文件 | 覆盖 |
|---|---|
| `tests/test_engine.py` | 公式单测 + 与前端 `engine.ts` 的 golden 输出对拍 |
| `tests/test_api.py` | HTTP 契约、校验错误、404、clamp、pathway 往返 |

## 3. Golden 对拍

`tests/golden.json` 是用前端 `pivott-web-application-design/lib/engine.ts` 生成的，
包含：

- `analysisNormal`：任务地图、roleExposure、confidence、3 条 routes
- `analysisFast`：同上，Fast 情景
- `pathway` / `pathwayFree`：`finance-systems-analyst` 的 5 步路径
- `roleTasks`：`finance-admin` 的默认任务地图

`test_engine.py` 用递归 `assert_close` 对比每个字段（浮点容差 `1e-9`）。
目前全部一致——这证明 Python 端口不是“看起来差不多”，而是逐字段相同。

## 4. 手工 HTTP 验证

启动：

```powershell
uvicorn app.main:app --port 8000
```

| 检查 | 期望 |
|---|---|
| `GET /api/health` | `counts = {roles:6, tasks:31, skills:15, signals:20}`，`seedVersion = 2026.10.1` |
| `GET /api/seed` | 6/31/15/20/4/24；`demoPersona.name = "Aisyah"` |
| `POST /api/analysis`（Aisyah，normal） | `roleExposure ≈ 0.619031`，`confidence = "Medium"`，6 tasks，3 routes |
| 同上，`scenario = "fast"` | `roleExposure ≈ 0.763981`，第一名变成 `finance-systems-analyst` |
| `GET /api/roles/finance-admin/tasks?scenario=normal` | 6 tasks，`roleExposure ≈ 0.619031` |
| `POST /api/pathways`（target `finance-systems-analyst`，8h） | 5 steps，`totalHours = 90`，`weeks = 12` |
| `GET /api/pathways/{id}` | 同样的 steps / weeks |
| `POST /api/pathways`（`freeOnly = true`） | 每个 step 的 resource 为 null 或 `free = true` |
| `GET /api/signals` | 20 条，按日期倒序，每条 `recency` 在 0–1 |
| `GET /api/sdgs` | 4 条，每条带 `roles` |
| `GET /docs` | Swagger UI 正常打开 |

## 5. 错误路径

| 请求 | 期望 |
|---|---|
| `POST /api/analysis` body `{"roleId":"nope"}` | `400 {"error":"Unknown roleId"}` |
| `POST /api/profiles` body `{}` | `400 {"error":"Unknown roleId"}` |
| `POST /api/pathways` 没有 `targetRoleId` | `400 {"error":"targetRoleId is required"}` |
| `GET /api/pathways/not-a-real-id` | `404 {"error":"Pathway not found"}` |
| `GET /api/roles/nope/tasks` | `404 {"error":"Role not found"}` |
| `POST /api/profiles` 非法 JSON | `400 {"error":"Body must be a JSON object"}` |

## 6. 评委可以现场看的证据

1. `/docs` 里的 10 个 `/api` 端点；
2. `/api/health` 的数据计数；
3. Normal → Fast 的 `roleExposure` 和排名变化；
4. `pytest -q` 的 `31 passed`；
5. `tests/golden.json` + `tests/test_engine.py` 的前后端对拍；
6. `README.md` 里的公式和架构图。

## 7. 一键复现（最短路径）

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest -q
uvicorn app.main:app --port 8000
# open http://127.0.0.1:8000/docs
```
