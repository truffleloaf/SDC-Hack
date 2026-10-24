# Pivott documentation

This index gives judges, developers and project owners a direct path to every maintained guide and retained historical record.

## Product and evidence

| Document | Description | Audience |
|---|---|---|
| [Root README](../README.md) | Product overview, quick start, architecture and verified limits | Judge, developer |
| [Architecture](architecture.md) | Short overview of the deployed web app, optional services and refresh flow | Judge, developer |
| [Domain 1 requirements](domain1-requirements.md) | Six challenge requirements mapped to routes, code, tests and limits | Judge, developer |
| [Data sources](data-sources.md) | O*NET, Arbeitnow, SDG attribution, synthetic data and refresh process | Judge, developer |
| [Verification record](verification.md) | Implementation and validation evidence from the Domain 1 work | Judge, developer |
| [SDG mapping](sdg-mapping.md) | Editorial mapping choices and their limits | Judge, developer |
| [Résumé import](resume-import.md) | Local parsing, confirmation boundary, privacy, limits and tests | User, developer |

## Deployment

| Document | Description | Audience |
|---|---|---|
| [Vercel](deployment/vercel.md) | Current single-service Next.js deployment and snapshot refresh | Developer, owner |
| [Render](deployment/render.md) | Optional FastAPI deployment beside the Vercel frontend | Developer, owner |

## Backend documentation

The [bilingual backend index](../backend/docs/README.md) is the complete entry point for FastAPI documentation.

| Document | Description | Audience |
|---|---|---|
| [Backend README](../backend/README.md) | Setup, test commands and API summary, with an English introduction | Developer |
| [Data model](../backend/docs/data-model.md) | Canonical backend entities, fields and constraints, in Chinese | Developer |
| [API design](../backend/docs/api-design.md) | Canonical request and response contracts, in Chinese | Developer |
| [Authentication](../backend/docs/auth.md) | Supabase JWT, personal-data endpoints and RLS, in Chinese | Developer, owner |
| [Live data](../backend/docs/live-data.md) | O*NET and job-feed import behavior and limits | Developer |
| [Architecture, English](../backend/docs/architecture.en.md) | English translation of the detailed backend architecture | Developer, judge |
| [Architecture, Chinese](../backend/docs/architecture.md) | Source detailed backend architecture document | Developer |
| [Demo script, English](../backend/docs/demo-script.en.md) | English translation of the three-minute demo script | Judge, presenter |
| [Demo script, Chinese](../backend/docs/demo-script.md) | Source three-minute demo script | Judge, presenter |
| [Backend deployment](../backend/docs/deploy.md) | Demo/live databases, environment variables and security | Developer, owner |
| [Local PostgreSQL](../backend/docs/local-postgres.md) | Schema, migrations, RLS and seed verification | Developer |
| [Auth client example](../backend/docs/examples/auth-client.ts) | Copyable TypeScript client for optional FastAPI auth endpoints | Developer |
| [Backend Supabase](../backend/supabase/README.md) | Backend schema, migrations and connection setup | Developer, owner |

## Historical records

These files explain earlier implementation decisions and are not maintained as current product documentation.

| Document | Description | Audience |
|---|---|---|
| [P0 readiness](history/2026-10-23-p0-readiness.md) | Historical hackathon-readiness implementation log | Developer |
| [Personal workspace](history/2026-10-23-personal-workspace.md) | Historical personal workspace integration log | Developer |
| [Interaction and account](history/2026-10-24-interaction-and-account-log.md) | Historical interaction, authentication and account work log | Developer |
| [Backend project archive](../backend/docs/archive/PROJECTS.md) | Historical Chinese backend work plan and linked issue drafts | Developer |

## Screenshots

Current and retained review captures are stored in [`docs/screenshots/`](screenshots/). The root README embeds `home-desktop.png` with descriptive alt text; other images are evidence assets and are not embedded in maintained Markdown.

## Contributing

Keep changes small enough to review and use focused commits. Update documentation when behavior or operations change.

- To change demo seed data, edit [`lib/data/seed.ts`](../web/lib/data/seed.ts), run `node scripts/data/generate-data.mjs`, and commit the generated backend fixtures with the source change.
- When changing a scoring formula, update the TypeScript and Python engines together and add equivalent assertions to both test suites.
- Before opening a pull request, run frontend lint, tests and build; backend pytest; the generated-data check; copy lint; and `node scripts/checks/check-links.mjs`.
- Use public or clearly synthetic data, retain source URLs and dates, and do not add invented jobs, courses or statistics.

Team names, a repository licence, GitHub description/topics and deployment ownership remain project-owner decisions.
