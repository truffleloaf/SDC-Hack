# System architecture

This overview shows how the deployed web application, optional services and data refresh process fit together.

```mermaid
flowchart LR
  Browser[Browser] --> Local[Local profile storage]
  Browser --> Engine[TypeScript scoring engine]
  Browser --> Routes[Next.js route handlers]
  Browser -. optional sign-in .-> Auth[Supabase Auth and account sync]
  Routes --> Snapshot[Committed demo and live snapshots]
  Browser -. optional API verification .-> FastAPI[FastAPI service]
  FastAPI -. optional persistence .-> Database[(SQLite or Supabase Postgres)]
  Refresh[Scheduled public-data refresh] --> ONET[O*NET 31.0]
  Refresh --> Arbeitnow[Arbeitnow API]
  Refresh --> Snapshot
```

Vercel deploys the Next.js application and its route handlers as the public product. The browser runs the deterministic TypeScript engine and stores guest work locally; configured Supabase credentials add sign-in and account saving. FastAPI is an optional, separately deployable implementation of the scoring contract, while the reviewable refresh workflow updates public catalogue and listing snapshots.

The current Vercel layout is described in [deployment/vercel.md](deployment/vercel.md). Detailed backend architecture is available in [English](../backend/docs/architecture.en.md) and the [Chinese source](../backend/docs/architecture.md).
