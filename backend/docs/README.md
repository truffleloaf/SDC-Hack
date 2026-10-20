# Pivott 后端文档索引

| 文档 | 内容 |
|---|---|
| [../README.md](../README.md) | 快速开始、API 表、数据、测试、设计说明 |
| [../PROJECTS.md](../PROJECTS.md) | 构建说明、与最初计划的差异、可选后续 |
| [architecture.md](architecture.md) | 系统边界、数据流、评分链路、安全与部署 |
| [demo-script.md](demo-script.md) | 3 分钟评委演示脚本与兜底 |
| [verification.md](verification.md) | 测试、golden 对拍、手工验证清单 |
| [../../pivott-web-application-design/README.md](../../pivott-web-application-design/README.md) | 前端 README（未改动） |
| [../../README.md](../../README.md) | 仓库根 README（未改动） |

## 约定

- 数据唯一来源是 `app/data/seed.json`，它是前端 `lib/data/seed.ts` 的 1:1 导出。
- 不要手改 `seed.json`；前端数据变了就重新导出。
- 公式改动必须同时跑 `pytest -q`，并确认 `tests/test_engine.py` 的 golden 对拍仍然通过。
- 根目录 `README.md` 和 `pivott-web-application-design/` 不属于后端范围，未做改动。
