# Pivott documentation / 文档索引

| Document / 文档 | Contents / 内容 |
| --- | --- |
| [Backend README](../README.md) | Setup, API, data, privacy, CORS and limitations |
| [Architecture — English](architecture.en.md) | Components, routing, formulas, custom-input verification, CI and security |
| [架构 — 中文](architecture.md) | 系统边界、数据流、评分链路、安全与部署 |
| [Demo script — English](demo-script.en.md) | Three-minute demo, default route, Verify with API and honest fallbacks |
| [演示脚本 — 中文](demo-script.md) | 数据、Normal/Fast 排名、路径和测试证据 |
| [验证清单 — 中文](verification.md) | pytest, golden parity and manual API checks |
| [Build notes](../PROJECTS.md) | Original implementation and optional future work |
| [Frontend README](../../pivott-web-application-design/README.md) | Website setup, API verification and UI workflow |
| [Repository README](../../README.md) | Pitch, screenshot, architecture, run commands and limitations |
| [Vercel deployment](../../VERCEL.md) | Two services, public routing and local combined smoke check |

The source dataset is `pivott-web-application-design/lib/data/seed.ts`; `app/data/seed.json` is its generated export. Never hand-edit it. Run `node scripts/generate-data.mjs` from the repository root after seed or mirrored-engine changes, then run frontend tests/type checking/build and backend pytest. Use `--check` to verify that exports are current. The root has both backend and frontend CI workflows.

数据变更请修改前端 `seed.ts` 后重新导出；评分公式变更必须同步 TypeScript/Python，并运行两边测试。用户资料保存在浏览器；仅点击 Verify with API 时发送计算输入，服务端不持久化。
