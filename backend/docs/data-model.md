# Backend data model

This document defines the persisted catalogue and account entities plus the calculated objects returned by the scoring engine.

## Dataset boundary

Demo and live are separate datasets. The meta table stores dataset, seed_version, data_as_of, and the demo persona when applicable. PIVOTT_DATASET and meta.dataset must agree.

The generated demo fixture currently contains 8 roles, 39 tasks, 15 skills, 20 signals, 25 resources, 3 scenarios, and 17 SDGs.

## Catalogue entities

| Entity | Main fields | Notes |
|---|---|---|
| Skill | id, name, category, hours_per_level, deliverable, why, sdgs | Skill names are unique |
| Role | id, title, family, demand, sort_order | A reference or target role |
| RoleRequirement | role_id, skill_id, required, importance, position | Composite role/skill requirement |
| Task | id, role_id, name, default_share, base_exposure, human_judgment, sort_order | Shares describe a reference role |
| TaskSkill | task_id, skill_id, position | Many-to-many task/skill link |
| Resource | id, skill_id, title, provider, url, hours, free, provenance | Learning resource with a source |
| Scenario | id, name, multiplier | slow, normal, or fast |
| SDG | id, name, color, sort_order | All 17 official goals |
| RoleSDG | role_id, sdg_id, position | Editorial role mapping |
| Signal | id, date, headline, source, source_url, direction, strength, evidence | verified, assumption, or user evidence |
| SignalTaskImpact | signal_id, task_id, impact | Signal effect on a task |
| JobPosting | source ID, role link, title, company, location, URL, dates | Live dataset only |

## Account profile

The backend profiles table stores one structured profile per authenticated user. It includes the role, scenario, weekly hours, task selections, skill ratings, completed steps, and custom items. Row-level security restricts all operations to auth.uid() = user_id.

The web account-sync migration uses a separate user_profiles table containing versioned profile JSON. These tables support different clients and must not be merged.

## Browser profile

Guest profiles stay in browser storage. A profile includes the selected role, task shares, optional custom tasks, skill ratings, scenario, target role, weekly learning hours, saved routes, completed steps, and user signals. Uploaded résumé files and extracted text are not stored in the profile.

## Derived objects

ScoredTask contains exposure, signal adjustment, confidence, and the Automate/Augment/Protect classification. RouteResult contains skill coverage, task similarity, fit bounds, target exposure, score, gaps, and explanation inputs. Pathway and PathwayStep contain ordered learning work, hours, resources, and deliverables. These objects are recalculated rather than persisted.

## Formula ownership

The TypeScript source is [web/lib/engine.ts](../../web/lib/engine.ts). The Python implementation is [backend/app/engine.py](../app/engine.py). Formula changes must be made and tested in both engines.
