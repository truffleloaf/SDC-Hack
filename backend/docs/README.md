# Backend documentation

This index covers the optional FastAPI implementation and its operational boundaries.

| Document | Purpose | Audience |
|---|---|---|
| [Data model](data-model.md) | Entities, constraints, persistence boundaries, and derived objects | Developer |
| [API design](api-design.md) | Requests, responses, endpoints, and errors | Developer |
| [Architecture](architecture.md) | Backend data flow, formulas, security, and deployment | Developer, judge |
| [Authentication](auth.md) | Supabase token validation, profile APIs, and RLS | Developer, owner |
| [Live data](live-data.md) | O*NET and job-feed import rules, attribution, and limits | Developer, judge |
| [Deployment](deploy.md) | Demo/live separation, environment variables, and safeguards | Developer, owner |
| [Render deployment](../../docs/deployment/render.md) | Optional Render service beside the Vercel web app | Developer, owner |
| [Local PostgreSQL](local-postgres.md) | Schema, migration, seed, and RLS verification | Developer |
| [Demo script](demo-script.md) | Three-minute walkthrough and checked figures | Judge, presenter |
| [Authentication client example](examples/auth-client.ts) | TypeScript example for the optional FastAPI auth bridge | Developer |
| [Historical project plan](archive/project-plan.md) | Archived implementation plan retained for traceability | Developer |
| [Historical work packages](archive/issues/) | Archived issue drafts | Developer |
| [Backend Supabase guide](../supabase/README.md) | Backend schema and connection setup | Developer, owner |

The canonical contracts are [data-model.md](data-model.md) and [api-design.md](api-design.md). Repository-wide product documentation is indexed at [docs/README.md](../../docs/README.md).
