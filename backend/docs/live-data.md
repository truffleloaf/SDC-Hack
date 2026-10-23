# Live 数据集：真实岗位、真实任务、真实在招职位

> demo 目录（6 岗位 / 31 任务）是手写种子，只用于演示。`live` 数据集由
> `app/live/` 从两个公开数据源现场构建，**不包含任何手写的岗位或任务**。
> 本文说明数据从哪来、怎么映射、哪些是原始数据、哪些是 Pivott 的模型。

## 1. 数据源

| 用途 | 来源 | 许可 / 条款 | 需要 key |
|---|---|---|---|
| 职业、任务、技能、职位别名 | [O*NET 31.0 Database](https://www.onetcenter.org/database.html)（美国劳工部） | [CC BY 4.0](https://www.onetcenter.org/license_db.html) | 否 |
| 现在在招的职位（demand） | [Arbeitnow Job Board API](https://www.arbeitnow.com/blog/job-board-api) | 免费公开 API，要求注明来源并链接回站 | 否 |
| 可选：更准确的职位计数 | [Adzuna API](https://developer.adzuna.com/) | 免费额度，需注册 | `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` |

O*NET 文本库是一个约 13 MB 的 zip（`db_31_0_text.zip`），下载后缓存在
`PIVOTT_CACHE_DIR`（默认 `.cache/onet/`）。Arbeitnow 每次抓 1–10 页、每页 300 条，
按天缓存在 `.cache/arbeitnow/`。**导入过程不调用 LLM。**

## 2. 选了哪些职业

`app/live/roles.py` 固定 10 个 O*NET-SOC 职业，覆盖 demo 里的三段路径
（行政/支持 → 财务/分析 → 数据/管理）：

| role id | O*NET-SOC | 官方职业名 | family |
|---|---|---|---|
| `bookkeeping-clerk` | 43-3031.00 | Bookkeeping, Accounting, and Auditing Clerks | Office & Admin Support |
| `executive-assistant` | 43-6011.00 | Executive Secretaries and Executive Administrative Assistants | Office & Admin Support |
| `customer-service-rep` | 43-4051.00 | Customer Service Representatives | Office & Admin Support |
| `accountant` | 13-2011.00 | Accountants and Auditors | Business & Finance |
| `budget-analyst` | 13-2031.00 | Budget Analysts | Business & Finance |
| `market-research-analyst` | 13-1161.00 | Market Research Analysts and Marketing Specialists | Business & Finance |
| `bi-analyst` | 15-2051.01 | Business Intelligence Analysts | Data & Analysis |
| `data-scientist` | 15-2051.00 | Data Scientists | Data & Analysis |
| `project-manager` | 13-1082.00 | Project Management Specialists | Management |
| `operations-manager` | 11-1021.00 | General and Operations Managers | Management |

选择标准：职业在 O*NET 里有完整的任务评分和技能评分（13-2051 等职业在 31.0
里缺少 IM/LV，会被自动跳过并在 `skipped` 里报告）；同时覆盖 demo 的邻接路径。

## 3. 映射规则（原始数据 → Pivott 表）

| Pivott 字段 | 来源 | 规则 |
|---|---|---|
| `roles.title` / `family` | Occupation Data | 官方标题；family 是 SOC 大类的展示名 |
| `tasks` | Task Statements | 每个职业取 **IM 重要度最高的 6 条**，不足 6 条全取 |
| `tasks.name` | Task 语句 | 截取动词短语（`to` / `for` / `by` / 逗号从句），最多 72 字符 |
| `tasks.description` | Task 语句 | 完整原句 + `O*NET-SOC`、task id、IM 重要度 |
| `tasks.default_share` | Task Ratings `IM` | 6 条重要度归一化到合计 100，整数，最小 1 |
| `skills` | Essential / Transferable Skills | 每个职业 IM 最高的 8 个元素；id 为名称 slug |
| `role_requirements.importance` | Skills `IM`（1–5，集中在 3–4） | `1 + round((IM−1)×4/3)`，展开到 1–5 |
| `role_requirements.required_level` | Skills `LV`（0–7） | `round(LV/7×4)`，clamp 1–4 |
| `task_skills` | Tasks→DWAs→GWAs→Skills 官方交叉表 | 每条任务取交叉到的前 3 个技能；没有交叉时退回该职业最重要的 3 个技能 |
| `roles.demand` | Arbeitnow / Adzuna | 与该职业匹配的在招职位数，相对第一名缩放到 0–100 |
| `job_postings` | Arbeitnow | 每个职业保留最新 10 条，带标题、公司、地点、日期、链接 |
| `role_sdgs` | 编辑决策 | 行政/支持类 → 8+10；财务/数据/管理 → 8 或 8+9 |
| `resources` / `signals` | 无 | live 暂不导入；路径里的 `resource` 为 `null` |
| `scenarios` / `sdgs` | 产品常量 | 与 demo 相同的 2 个情景、4 个 SDG |

职位匹配用 O*NET 自带的 reported job titles（`Job Titles.txt`）加上
`app/live/roles.py` 里的德语/英语别名，**最长匹配优先**，所以
“business intelligence analyst” 不会被更短的 “analyst” 抢走。匹配只发生在标题和
tags 上，不看正文，避免误召回。

## 4. 两个数是 Pivott 的模型，不是 O*NET 的测量

`base_exposure` 和 `human_judgment` 没有官方字段。live 用固定的线索模型
`pivott-onet-cues-v1`（`app/live/scoring.py`）：

```text
routine   = min(3, 自动化线索词数)      # enter / record / reconcile / check / prepare ...
judgment  = min(3, 判断线索词数)        # advise / negotiate / coordinate / decide / manage ...
physical  = min(2, 体力线索词数)        # lift / drive / install / repair ...

base_exposure  = clamp(0.46 + 0.14×routine − 0.12×judgment − 0.12×physical, 0.05, 0.95)
human_judgment = clamp(0.10 + 0.25×judgment − 0.04×routine + job_zone_bonus, 0.05, 0.95)
```

`job_zone_bonus`：Job Zone 4–5 为 +0.06，Zone 2 为 −0.03，其余 0。
线索词表、权重和版本号都在代码里，`meta.live_source.model` 会记录 `pivott-onet-cues-v1`，
同一句话永远得到同一个分数。

**这是估计，不是测量。** 它解决的是“demo 的任务是编的”这个问题：任务、技能、
重要度、职位都是真的；暴露度是 Pivott 用公开规则算出来的，可以逐条复查
（`GET /api/roles/{id}/tasks` 能拿到分数，`tasks.description` 里有 O*NET 出处）。

## 5. 运行

```powershell
$env:PIVOTT_DATASET = 'live'
$env:PIVOTT_DB      = 'sqlite:///./pivott-live.db'   # live 必须显式给库
.\.venv\Scripts\python.exe -m app.live sync          # 下载 + 构建 + 写入
.\.venv\Scripts\python.exe -m app.live status        # 看上次导入的来源和计数
.\.venv\Scripts\python.exe -m app.live roles         # 列出配置的 10 个职业

.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8001
```

常用参数：

| 参数 | 作用 |
|---|---|
| `--offline` | 只用缓存；Arbeitnow 会退回最近一天的快照 |
| `--pages 1..10` | 抓多少页职位（默认 5，每页 300 条） |
| `--jobs arbeitnow|adzuna|none` | demand 来源；`none` 时所有职业 demand=50 |
| `--tasks N` / `--requirements N` | 每个职业取多少任务 / 技能要求 |
| `--dry-run` | 只构建和打印，不写库 |

`PIVOTT_DATASET=demo` 时 `sync` 会直接拒绝；`write_catalog` 也会拒绝
`meta.dataset = demo` 的库，和 demo 种子互不污染。

### Adzuna（可选）

有 key 时 `--jobs auto` 会优先用 Adzuna：对每个职业的搜索词取 `count` 的最大值，
比按标题匹配 Arbeitnow 更接近真实需求。

```powershell
$env:ADZUNA_APP_ID  = '...'
$env:ADZUNA_APP_KEY = '...'
$env:ADZUNA_COUNTRY = 'de'   # us / gb / de / fr / nl / au ...
.\.venv\Scripts\python.exe -m app.live sync --jobs adzuna
```

## 6. 新增的 API

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/live/status` | 数据集来源、导入时间、O*NET 版本/许可、demand 方法和计数 |
| GET | `/api/live/jobs?roleId=&limit=` | 支撑该职业 demand 的真实在招职位（含链接、公司、日期） |

`GET /api/health` 在 live 下返回 `dataset: live`、`seedVersion: onet-31.0+...`、
`dataAsOf` 为导入当天。原有 `/api/seed`、`/api/analysis`、`/api/pathways` 等契约不变，
只是数据来自 live 库。

示例（10 个职业 / 60 任务 / 17 技能 / 85 条职位）：

```jsonc
// GET /api/live/status
{
  "dataset": "live",
  "imported": true,
  "seedVersion": "onet-31.0+arbeitnow-2026-10-23",
  "dataAsOf": "2026-10-23",
  "counts": { "roles": 10, "tasks": 60, "skills": 17, "signals": 0, "postings": 85 },
  "catalog": {
    "name": "O*NET 31.0 Database",
    "license": "CC BY 4.0",
    "release": "2026-08",
    "occupations": [{ "code": "43-3031.00", "slug": "bookkeeping-clerk", "title": "Bookkeeping, Accounting, and Auditing Clerks" }]
  },
  "demand": { "name": "Arbeitnow job board", "status": "live", "matched": 188, "counts": { "bookkeeping-clerk": 6 } },
  "model": { "exposure": "pivott-onet-cues-v1" }
}
```

## 7. 数据库

live 使用与 demo 相同的 12 张目录/信号表 + `meta`，另外有一张 `job_postings`
（demo 里为空，live 存 85 条在招职位）。如果 live 也开放登录，再执行
`profiles` migration（同一张表，独立库）。已有库升级执行：

```sql
-- supabase/migrations/202610230045_job_postings.sql
-- 需要登录时再加：202610231200_profiles.sql
```

`meta` 额外写入 `live_source`，内容是本次导入的完整来源 JSON（O*NET 许可、职业列表、
Arbeitnow 快照日期/页数/匹配数、模型版本）。live 部署建议：

```text
PIVOTT_DATASET=live
PIVOTT_DB=postgresql+psycopg://...        # 独立库，绝不复用 demo 库
PIVOTT_AUTO_SEED 不生效（live 恒不 seed）
ALLOW_DEMO_RESET 不生效（live 恒 403）
```

## 8. 已知限制

- **exposure 是模型**：线索词表是英文的，对非英语任务不可用；它是可复现的规则，
  不是 O*NET 的官方评分。
- **demand 是快照**：Arbeitnow 是一个以德国为主的招聘板，`demand` 只代表“这个快照里
  匹配到多少条职位”，不是劳动力市场总量。用 Adzuna 时才有真实的搜索结果计数。
- **匹配召回有限**：本次快照 1 481 条职位里匹配到 188 条（12.7%），未匹配的是其他职业。
- **技能偏通用**：O*NET Essential/Transferable Skills 是认知类技能（Critical Thinking、
  Reading Comprehension 等），不是 Excel/SAP 这类工具技能。工具技能（O*NET
  Technology Skills）是下一步的增强项。
- **没有学习资源**：live 不导入 `resources`，路径步骤的 `resource` 为 `null`，
  周数仍然按 `gap × hoursPerLevel` 计算。
- **没有信号**：`signals` 为空，`roleExposure` 只由 `baseExposure × 情景系数` 决定；
  `confidence` 因此是 `Low`。用户新增信号是 demo 能力，live 同步会清空信号层。
- **中文岗位**：O*NET 是美国职业库；要分析中文岗位，需要换成 ESCO/本地职位源，
  适配器接口在 `app/live/jobs.py`。

## 9. 验证

```powershell
.\.venv\Scripts\python.exe -m pytest -q        # 85 passed（含 18 个 live 测试）
curl http://127.0.0.1:8001/api/health          # dataset=live
curl http://127.0.0.1:8001/api/live/status     # 来源、许可、计数
curl "http://127.0.0.1:8001/api/live/jobs?roleId=bookkeeping-clerk"
```

测试用 `tests/test_live.py` 里自建的小型 O*NET 压缩包，不访问网络；真实导入只在
`python -m app.live sync` 时发生。

## 10. 署名

- O*NET 31.0 Database, U.S. Department of Labor, Employment and Training
  Administration, CC BY 4.0. <https://www.onetcenter.org/database.html>
- Job posting data from Arbeitnow. <https://www.arbeitnow.com/>
