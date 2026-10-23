# Pivott 3 分钟演示脚本（与 demo 对齐）

> 目标：让评委在 3 分钟内从“我的工作会被 AI 怎样影响”走到“我下周该学什么、学完能去哪儿”，并且每个数字都能点开看依据。
>
> 本文所有数字都按前端 demo 的 seed/engine 复算过；与旧脚本冲突的地方以本文为准。

## 0. 演示前 60 秒检查

- [ ] 前端已启动：`pnpm install && pnpm dev`，打开 <http://localhost:3000>
- [ ] `GET /api/health` 返回 `status: ok`、`dataset: demo`、`seedVersion: 2026.10.1`、`dataAsOf: 2026-10-01`
- [ ] 浏览器只留演示标签：landing、task map、routes、signals、pathway
- [ ] 关闭通知、微信、无关标签
- [ ] 点 **See a 30-second example** 进入 Aisyah demo 模式（右上角有 Demo 标记）
- [ ] 如果之前演示过：先 **Exit demo**，再重新进入；或清掉 `pivott:v1` / `pivott:v1:personal`
- [ ] 记下当前信号数量（20 条 seed）；演示结束用 `POST /api/seed` 或刷新恢复

> 前端 demo 不需要 `.env`、Supabase、`uvicorn` 或 `python -m app.seed`；如果改用 FastAPI，再按 README 的 quick start 启动后端。

## 1. 时间线

| 时间 | 屏幕 | 动作 | 话术 |
|---|---|---|---|
| 0:00–0:20 | Landing | 指向 Living Task Map；点 **See a 30-second example** | “Jobs don't disappear in one piece. A job is a bundle of tasks — AI is good at some, bad at others.” |
| 0:20–0:45 | Start | 选 **Finance Admin**；展示 6 个任务和时长条 | “Aisyah 的工作由 6 类任务组成，时间占比 30/20/15/15/10/10。我们先看她的时间花在哪。” |
| 0:45–1:30 | Task Map | 读 **62% task exposure**；hover **Invoice entry**；切 Normal → Fast | “这是任务暴露度，不是失业概率。Normal 是 62%，Fast 是 76%；发票录入到 100%，异常处理仍有 46% 需要人。” |
| 1:30–2:05 | Career Routes | 确认情景是 **Fast**；展示 3 张卡；点 **Why this score?** | “Fast 下系统算出她离 Finance Systems Analyst 最近，fit 56%，缺 5 项技能、共 90 小时。” |
| 2:05–2:35 | Pathway | 拖 hours/week 到 8，再拖到 12；切 free-only；勾第一步 | “8 小时/周是 12 周；12 小时/周是 8 周。每一步都有真实资源、工时和交付物。” |
| 2:35–3:00 | Signals | 打开 Admin，新增一条信号；点 **Recompute task map** | “加一条新信号，任务暴露度立刻变化，并高亮变动的任务。不是写死的。” |
| 3:00 | 收尾 | 回到 landing | “Don't predict the job. Map the tasks. Route the skills.” |

## 2. 每一步的准确数字

### 2.1 Start：Aisyah 的 6 个任务

| 任务 | 时间占比 |
|---|---:|
| Invoice entry | 30% |
| Bank reconciliation | 20% |
| Exception handling | 15% |
| Month-end reporting | 15% |
| Client communication | 10% |
| Expense claim review | 10% |

### 2.2 Task Map：Normal vs Fast

| 任务 | Normal | 分类 | Fast | 分类 |
|---|---:|---|---:|---|
| Invoice entry | 82% | Automate | 100% | Automate |
| Bank reconciliation | 69% | Automate | 86% | Automate |
| Exception handling | 36% | Protect | 46% | Protect |
| Month-end reporting | 59% | Augment | 73% | Augment |
| Client communication | 26% | Protect | 33% | Protect |
| Expense claim review | 66% | Automate | 81% | Automate |
| **整体** | **62%** | | **76%** | |

话术补充：分类阈值是 `Automate = exposure ≥ 65% 且 judgment < 40%`，`Protect = judgment ≥ 65%`，其余 `Augment`。Invoice 的 base 是 78%，Fast 乘 1.25 后到 97.5%，再加信号 +4.2 点，封顶 100%。

### 2.3 Career Routes：注意情景

| 情景 | 第 1 名 | fit | target exposure | 分数 | gaps | 6h/周 |
|---|---|---:|---:|---:|---:|---:|
| Normal | Operations Coordinator | 62% | 49% | 58.8 | 4 | 8 周 |
| Fast | **Finance Systems Analyst** | 56% | 46% | 55.5 | 5 | 15 周 |

**必须先切到 Fast 再说“Finance Systems Analyst 最近”**；Normal 下第 1 名是 Operations Coordinator。Fast 前两名只差 0.4 分，这正好可以讲“路线不是拍脑袋，是 fit 和 target exposure 的加权”。

Why sheet 里的 FSA 拆解：

```text
coverage = 0.5868
similarity = 0.4545
fit = 100 × (0.8 × 0.5868 + 0.2 × 0.4545) = 56.0
target_exposure = 0.4576
route_score = 0.7 × 56.0 + 30 × (1 − 0.4576) = 55.5
```

### 2.4 Pathway：90 小时，周数随滑块变

Finance Systems Analyst 的 5 个 gap：

| 顺序 | 技能 | 当前 → 要求 | gap 小时 |
|---:|---|---:|---:|
| 1 | Process automation | 1 → 3 | 24 |
| 2 | Process design | 1 → 3 | 20 |
| 3 | SQL | 0 → 2 | 24 |
| 4 | ERP systems | 3 → 4 | 14 |
| 5 | Stakeholder communication | 2 → 3 | 8 |
| | **合计** | | **90** |

周数：6h/周 = 15 周；**8h/周 = 12 周**；**12h/周 = 8 周**。旧脚本的“8 小时 6 周、12 小时 4 周”是旧数据，不要再用。

free-only：Process design 和 Stakeholder 会从付费的 Coursera 切到 OpenLearn；Automation 用 Power Automate / UiPath，SQL 用 SQLBolt / Khan Academy，ERP 用 SAP Learning。

### 2.5 Signals：现场改一个数

Admin 表单限制：日期不能晚于 `2026-10-01`；headline ≥ 8 字符；source link 必须是 `https://`；至少选 1 个任务；strength 0.1–1；impact 0.05–0.4。

示例信号（Normal 情景）：

```text
date: 2026-09-30
headline: A new invoice agent reaches finance teams
source: Demo source · https://example.org/signal
direction: +1
strength: 0.60
impact: 0.15
task: Invoice entry
```

Recompute 后：Invoice entry 82% → 91%，整体 62% → 65%，map 上 Invoice 气泡高亮 7 秒。话术：“这条信号只影响发票录入，所以只有它变了；其他任务不动，说明 diff 是可信的。”

## 3. 备用说法

### 如果评委问“数据是真的吗？”

> “演示数据是合成的。20 条信号里 8 条标 `verified`、12 条标 `illustrative`，每条都有来源链接和 evidence badge。我们刻意没有编造真实统计；产品逻辑和公式是完整的，换成 20–30 条核实过的来源即可上线。”

### 如果评委问“你们用 LLM 打分吗？”

> “不用。所有分数是确定性公式，可以手算、可以单测。LLM 最多用来生成解释文案，而且有模板兜底。”

### 如果评委问“62% 是不是失业概率？”

> “不是。它是按时长加权的任务暴露度：这个岗位里有多少工作内容 AI 可能接手。我们从不输出‘失业概率’。”

### 如果评委问“为什么推荐这个岗位？”

> 打开 **Why this score?**，指 `coverage / similarity / fit / gap priority / weeks / route score` 的代入值，并说明 Normal/Fast 会改变排名。

### 如果评委问“隐私怎么办？”

> “不需要登录；profile、进度、自定义信号都只存在浏览器 localStorage。Delete my data 会清掉 `pivott:v1` 和备份键，服务端没有个人数据。”

## 4. 故障预案

| 故障 | 处理 |
|---|---|
| 前端打不开 | 用 `GET /api/seed`、`POST /api/analysis` 直接调 route handler，口述同一链路；或展示预置截图 |
| 页面状态乱了 | **Exit demo** 后重新进入；或清 localStorage 再点 example |
| 新增信号失败 | 跳过现场写入，展示预置的 before/after 截图或 JSON |
| 时间不够 | 只走 Landing → Task Map → Routes → 一句话收尾；Pathway 和 Signals 留作 Q&A |
| 评委要求看代码 | 打开 `lib/engine.ts` 和 `lib/data/seed.ts`，指公式、阈值和 seed 数据 |
| 被问“为什么没有数据库” | “demo 是只读目录 + 浏览器状态；要多人共享再加 Supabase，数据模型已经定好。” |

## 5. 演示后

- [ ] 在 Signals 页删掉刚加的用户信号，或 `POST /api/seed`
- [ ] 点 **Exit demo** 恢复个人档案；或清掉 `pivott:v1` / `pivott:v1:personal`
- [ ] 关闭前端进程
- [ ] 记录本次 seed 版本（`2026.10.1`）和 `dataAsOf`（`2026-10-01`）

## 6. 30 秒极简版

> “AI 不会一次性取代一个岗位，它会吃掉其中一些任务。Pivott 把岗位拆成任务，算出哪些任务暴露、哪些技能还值钱、最近的相邻岗位是什么，再给出按周的学习路径。每个数字都能展开看公式和来源。我们不预测失业，我们给出下一步。”

## 7. 数据核对（防止口误）

- 6 个角色、31 个任务、15 个技能、20 条信号、24 个资源、4 个 SDG、2 个情景。
- Aisyah：Finance Admin，6 个任务，Normal 62%、Fast 76%。
- Fast 第 1 名是 Finance Systems Analyst（fit 56%）；Normal 第 1 名是 Operations Coordinator（fit 62%）。
- FSA 路径：5 步、90 小时；8h/周 = 12 周，12h/周 = 8 周。
- 旧脚本中的“5 类任务”“只缺 SQL 和自动化”“8 小时 6 周”“12 小时 4 周”都已过时。
