# FastAPI contract

This document summarizes the implemented FastAPI endpoints and the shared request and response rules.

## Conventions

- Paths are rooted at /api.
- JSON field names follow the frontend camelCase contract.
- Errors use an error field and the appropriate HTTP status.
- Analysis and pathway responses are calculated on request and are not wrapped in a data envelope.
- A signed-in user ID comes from the verified access-token subject, never from a request body.

## Profile input

Analysis accepts a roleId, task selections, skill levels, scenario, hoursPerWeek, freeOnly, and an optional targetRoleId. Custom tasks and user signals are accepted only through their documented structures. Unknown catalogue IDs are rejected or filtered according to the endpoint schema.

## Public catalogue and analysis endpoints

| Method and path | Purpose |
|---|---|
| GET /api/health | Service, dataset, seed version, date, and catalogue counts |
| GET /api/seed | Complete catalogue used by clients |
| POST /api/profiles | Validate and echo profile input without persistence |
| POST /api/analysis | Score selected tasks and rank adjacent roles |
| POST /api/pathways | Build a learning pathway for the selected target |
| GET /api/pathways/{id} | Recalculate a pathway from its encoded input |
| GET /api/roles/{id}/tasks | Return role tasks under a selected scenario |
| GET /api/signals | Return catalogue signals |
| GET /api/sdgs | Return all supported SDGs |
| GET /api/live/status | Return live-source metadata and trend readiness |
| GET /api/live/jobs | Return filtered public job listings |

## Authentication and personal data

| Method and path | Purpose |
|---|---|
| GET /api/auth/config | Public Supabase connection metadata and availability |
| GET /api/auth/me | Return the verified user identity |
| POST /api/auth/signin | Optional email/password bridge |
| POST /api/auth/signup | Optional account-creation bridge |
| POST /api/auth/refresh | Refresh an auth session |
| POST /api/auth/signout | End an auth session |
| POST /api/auth/password/reset | Request password recovery |
| GET /api/me/profile | Read the signed-in user's profile |
| PUT /api/me/profile | Create or replace the signed-in user's profile |
| DELETE /api/me/profile | Delete the signed-in user's profile |

The web application normally uses Supabase directly. The bridge exists for clients that cannot use the browser SDK.

## Demo control endpoints

POST /api/signals adds a user signal when demo controls are enabled. POST /api/analysis/recompute applies selected signals and returns before/after output. POST /api/seed resets demo state only when ALLOW_DEMO_RESET is enabled; it is forbidden for live datasets.

## Status codes

- 400: invalid profile, malformed pathway ID, or unsupported input
- 401: missing or invalid authentication
- 403: disabled demo control or forbidden dataset operation
- 404: unknown catalogue or pathway item
- 409: stale profile revision or dataset conflict
- 422: schema validation failure
- 503: unavailable database, auth provider, or required configuration

Interactive schemas and examples are available from /docs when FastAPI is running. Automated contract coverage is in [backend/tests](../tests/).
