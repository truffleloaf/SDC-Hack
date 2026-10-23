# Pivott 文档索引

> 数据模型和 API 契约只认这两份：`data-model.md`、`api-design.md`。其他文档如果数字冲突，以它们为准。

| 文档 | 内容 |
|---|---|
| [data-model.md](data-model.md) | **事实来源**：实体、字段、约束、数量、Aisyah 演示档案、与旧模型的差异 |
| [api-design.md](api-design.md) | **事实来源**：`ProfileInput`、10 个 demo 方法、2 个演示控制端点、10 个 auth/个人数据方法、错误、页面映射 |
| [auth.md](auth.md) | Supabase Auth：环境变量、JWKS 校验、`/api/auth/*`、`/api/me/profile`、前端接入、RLS |
| [auth-client.ts](auth-client.ts) | 可直接复制到前端的登录桥客户端（signIn / signUp / refresh / profile CRUD） |
| [live-data.md](live-data.md) | live 真实数据：O*NET 31.0 + Arbeitnow/Adzuna、映射规则、线索模型、限制 |
| [architecture.md](architecture.md) | 架构、请求数据流、公式、安全、部署、当前实现状态 |
| [deploy.md](deploy.md) | 部署：demo / live 两套库、Supabase、SQLite 持久卷、环境变量、安全清单 |
| [deploy-render.md](deploy-render.md) | 前端 Vercel + 后端 Render 的部署步骤（含 `render.yaml`） |
| [local-postgres.md](local-postgres.md) | 本地真实 PostgreSQL 验证：schema / seed / migration / RLS / TRUNCATE |
| [demo-script.md](demo-script.md) | 3 分钟演示脚本、准确数字、备用话术、故障预案 |
| [issues/](issues/) | 6 个工作包的 issue 草稿（数字已按新模型更新） |
| [../README.md](../README.md) | 项目 README（quick start + 已实现 API） |
| [../supabase/README.md](../supabase/README.md) | Supabase 14 张表（含 `meta`、`job_postings`、`profiles`）的建表与连接步骤 |

## 目录约定

- `docs/issues/` 只放**任务说明**，不放代码。
- 代码仍然在 `app/`、`supabase/`、`tests/` 下；**不要**按工作包拆成 6 个代码目录。
- 每完成一个工作包，在对应 issue 里勾选验收项，并把 PR 链接贴进去。
- 文档里的数字（角色/任务/技能/信号/SDG/资源数量）必须和前端 seed 一致：**6 / 31 / 15 / 20 / 4 / 24**。改数据时同步改 `data-model.md`、`demo-script.md` 和 README。
