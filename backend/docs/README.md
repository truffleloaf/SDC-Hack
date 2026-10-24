# Pivott backend documentation / Pivott 后端文档

This bilingual index points developers to the FastAPI contracts, operations guides, translations, examples and archived planning notes. / 本双语索引帮助开发者查找 FastAPI 契约、运维指南、译文、示例和归档计划。

The data model and API contract are defined by `data-model.md` and `api-design.md`; if another backend document disagrees, use those two. / 数据模型和 API 契约以 `data-model.md` 和 `api-design.md` 为准；其他后端文档如有冲突，以这两份为准。

| Document / 文档 | Purpose / 用途 | Audience / 读者 |
|---|---|---|
| [Data model / 数据模型](data-model.md) | Canonical entities, fields, constraints and demo counts. / 实体、字段、约束和演示数量的事实来源。 | Developer / 开发者 |
| [API design / API 设计](api-design.md) | Canonical requests, responses, errors and route mapping. / 请求、响应、错误和路由映射的事实来源。 | Developer / 开发者 |
| [Authentication / 认证](auth.md) | Supabase Auth, JWKS checks, personal profile endpoints and RLS. / Supabase Auth、JWKS 校验、个人档案端点和 RLS。 | Developer, owner / 开发者、所有者 |
| [Authentication client example / 认证客户端示例](examples/auth-client.ts) | Copyable TypeScript bridge for the optional FastAPI auth endpoints. / 可复制的 FastAPI 认证 TypeScript 客户端。 | Developer / 开发者 |
| [Live data / 实时数据](live-data.md) | O*NET 31.0 and Arbeitnow import rules, demand signals and limits. / O*NET 31.0、Arbeitnow 导入规则、需求信号和限制。 | Developer, judge / 开发者、评委 |
| [Architecture in Chinese / 中文架构](architecture.md) | Source document for backend architecture, formulas, security and deployment. / 后端架构、公式、安全和部署的中文源文档。 | Developer / 开发者 |
| [Architecture in English / 英文架构](architecture.en.md) | English translation of the architecture source. / 架构源文档的英文翻译。 | Developer, judge / 开发者、评委 |
| [Deployment / 部署](deploy.md) | Demo/live database separation, environment variables and security checks. / 演示与实时数据库分离、环境变量和安全检查。 | Developer, owner / 开发者、所有者 |
| [Render deployment / Render 部署](../../docs/deployment/render.md) | Deploy the optional FastAPI service on Render beside Vercel. / 在 Vercel 旁用 Render 部署可选 FastAPI 服务。 | Developer, owner / 开发者、所有者 |
| [Local PostgreSQL / 本地 PostgreSQL](local-postgres.md) | Verify schema, migrations, RLS and seed behavior against PostgreSQL. / 在 PostgreSQL 上验证结构、迁移、RLS 和种子。 | Developer / 开发者 |
| [Demo script in Chinese / 中文演示脚本](demo-script.md) | Source three-minute walkthrough with figures and recovery steps. / 含数据和故障预案的三分钟演示源文档。 | Judge, presenter / 评委、演示者 |
| [Demo script in English / 英文演示脚本](demo-script.en.md) | English translation of the demo script. / 演示脚本的英文翻译。 | Judge, presenter / 评委、演示者 |
| [Archived project plan / 归档项目计划](archive/PROJECTS.md) | Historical Chinese work plan retained for traceability. / 为可追溯性保留的中文历史计划。 | Developer / 开发者 |
| [Archived issue drafts / 归档任务草稿](archive/issues/) | Historical Chinese work-package drafts. / 中文历史工作包草稿。 | Developer / 开发者 |
| [Backend README / 后端 README](../README.md) | Setup, commands and implemented endpoint summary. / 安装、命令和已实现端点摘要。 | Developer / 开发者 |
| [Backend Supabase guide / 后端 Supabase 指南](../supabase/README.md) | Backend schema and connection steps. / 后端数据库结构和连接步骤。 | Developer, owner / 开发者、所有者 |

## Directory rules / 目录约定

- `backend/docs/` contains maintained backend design and operations documents. / `backend/docs/` 保存维护中的后端设计和运维文档。
- `backend/docs/examples/` contains documentation examples, not compiled application code. / `backend/docs/examples/` 保存文档示例，不是编译中的应用代码。
- `backend/docs/archive/` contains historical planning material. / `backend/docs/archive/` 保存历史计划材料。
- Repository-wide product, evidence and deployment documents are indexed in [`docs/README.md`](../../docs/README.md). / 全仓库产品、证据和部署文档见 [`docs/README.md`](../../docs/README.md)。
