# [P1-6] 质量与交付：tests + README + CI

**Labels:** `backend`, `p1`, `docs`  
**Milestone:** M4 — demo ops  
**Depends on:** P0-1 ~ P1-5  
**Blocks:** 无（收尾）

## 目标

让评委和队友能**在 5 分钟内**跑起来、跑通测试、看懂仓库，而不是只看到一堆代码，也不是看到一份和 demo 对不上的 README。

## 范围

### 做

- `pytest`：公式单测 + 主流程集成测试（health → seed → analysis → pathways → signals → reset）。
- 种子校验：数量 6 / 31 / 15 / 20 / 4 / 24、外键、URL、`default_share` 合计 100。
- 黄金用例：Aisyah Normal = 0.619、Fast = 0.764；Normal 第一名 Operations Coordinator、Fast 第一名 Finance Systems Analyst；FSA 90h / 15 周（6h）。
- README 重写：what / 文档索引 / demo 数字 / API / 当前状态 / 下一步。
- `Dockerfile`（API 可容器化）。
- GitHub Actions：push/PR 跑 `pytest -q`。
- `docs/demo-script.md` 与实际演示一致。
- 提供 `.env.example`，确认 `.env` 不在仓库里。

### 不做

- 不追求 100% 覆盖率；优先覆盖公式和主流程。
- 不把 CI 配成依赖真实 Supabase（用内存 SQLite / mock）。
- 不在 README 里写假数据来源，也不照抄旧数据量。
- 不把前端 demo 的页面交互塞进 pytest。

## 验收标准

- [ ] `pytest -q` 全绿，且不依赖网络。
- [ ] 新环境按 README 的 quick start 能启动 API。
- [ ] `pytest -q` 17 passed（公式 + Aisyah 62% / 76.4% + pathway + signals diff + reset/CORS）。
- [ ] `GET /api/health` 返回 ok，counts 与 seed 一致。
- [ ] CI 在 PR 上运行并通过。
- [ ] README / `docs/data-model.md` / `docs/demo-script.md` 的数字一致：6 / 31 / 15 / 20 / 4 / 24。
- [ ] README 不再声称 16 skills、15 signals、17 SDGs、18 resources、5 tasks/role（当前已是 15 / 20 / 4 / 24 / 31）。
- [ ] 仓库里没有 `.env`、`.venv`、`*.db`、`__pycache__`。
- [ ] `Dockerfile` 能 build 并启动（当前环境没有 Docker，未实际 build）。

## 关键文件

- `tests/`
- `README.md`
- `docs/data-model.md`
- `docs/api-design.md`
- `docs/demo-script.md`
- `.github/workflows/tests.yml` — 已加 seed 冒烟测试
- `Dockerfile` — 已建（healthcheck，默认关闭 demo reset）
- `docs/deploy.md` — Supabase/Postgres 与 SQLite 持久卷
- `.env.example`

## 演示证据

- CI 通过的 badge / 截图
- 新环境 quick start 录屏
- `pytest -q` 输出
- `docs/demo-script.md` 第 7 节的“数据核对”与页面截图一致
