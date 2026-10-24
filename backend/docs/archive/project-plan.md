Historical log. Not maintained.

# Backend project plan

This archived plan records how the original backend work was divided before implementation.

## Work packages

| Package | Original objective | Current location |
|---|---|---|
| P0-1 | Establish catalogue schema and deterministic seed data | app/models.py, app/seed_data.py, supabase |
| P0-2 | Implement scoring formulas and golden tests | app/engine.py, app/services, tests |
| P0-3 | Implement the demo-compatible HTTP contract | app/routers, app/schemas.py |
| P1-4 | Generate pathways and connect learning resources | app/services/pathway.py |
| P1-5 | Support signal changes, recomputation, and reset controls | app/routers/signals.py, app/routers/admin.py |
| P1-6 | Add tests, documentation, CI, and delivery safeguards | tests, docs, root workflows |

The plan recommended one backend repository with modules for data, scoring, APIs, pathways, signals, and verification. That structure is now implemented inside backend.

The detailed archived issue drafts remain in [issues](issues/). Current contracts are documented in [data-model.md](../data-model.md) and [api-design.md](../api-design.md).
