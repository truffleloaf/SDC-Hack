# Domain 1 implementation and verification

## S1: refreshable trend layer

Count-derived role and skill signals, dated count snapshots, public observation history (90 days), a weekly/manual refresh workflow, Radar thresholds and baseline score/rank comparison are implemented. The workflow writes a reviewable data branch with the built-in GitHub token and needs no custom secret. Feed failure stops the refresh before tracked changes.

**Boundary:** the development environment returns HTTP 403 for Arbeitnow. The older committed snapshot lacks posting windows; the UI explicitly says counts are not computed and produces no invented trends. Live acceptance requiring nonzero signals cannot be claimed until a real refresh has enough history. The current committed `jobs.live.json` is empty because the upstream 85 display postings were in a database that was not committed. Refresh exports real listings for browsing.

**Verification:** lint, frontend tests, production build and backend tests. Fixture tests cover exact counts, direction, strength, equal windows, thin windows, future postings and duplicate IDs. Frontend scoring tests prove signals can change scores.

GitHub REST/GraphQL API calls are blocked (Forbidden), while git push works. Section branches are published for review; PR creation must be completed from GitHub's compare page if API access remains blocked.

## S2: source integrity

The twelve invented publication attributions had already been removed in Brief 3: they are undated assumptions, without publisher names or URLs, and appear in their own section. Regression tests now reject every verified signal missing its date or source URL. Remaining UI percentages are calculated model outputs, with the method linked; they are not population statistics.

The challenge brief supplies Malaysian figures attributed to Hays and MOSTI. Their source pages cannot be opened from this environment. In accordance with the brief's global rule to omit unverified statistics, those figures are **not** presented as verified website facts. The eight pre-existing published demo references retain their original source URLs/dates; this work does not claim they were independently reverified. Live mode uses only count-derived feed signals.

## S3: SDG choices

All 17 official goals are included. Every live and sample role/skill is tagged through one canonical mapping and a generated frontend copy. The mapping rationale is documented in `docs/sdg-mapping.md` and explicitly represents team judgment. Routes support an optional capped focus bonus and show unadjusted ranks; pathway/passport aggregate the selected role and skills. The optional SQL backend needs the included skill-SDG migration before deployment.

Validation: 109 frontend tests, 129 backend tests, lint and production build; mapping completeness/identity, aggregate counts and focus-driven rank changes are checked.

## S4: pathway provenance and resources

Each step shows current→target level, estimated hours/weeks, its priority calculation, mapped O*NET importance and the resource provider/link when present. Free filtering works in live mode. The resource schema supports cost, verified date and HRD Corp badges backed by an explicit claim source; the importer rejects unverified entries. The HRD Corp note explains employer/programme eligibility.

**Boundary:** OpenLearn, Harvard CS50 and HRD Corp page requests returned HTTP 403 in this environment. The live resource registry is deliberately empty, and steps say “No vetted resource yet.” No programme is falsely marked claimable. The HRD Corp link goes to the official site rather than claiming a specific verified course-list URL. The O*NET figure shown is a mapped requirement weight; learning hours are explicitly team estimates. The old snapshot did not preserve raw skill importance values, so the UI does not invent them.

Validation: all frontend/backend tests, lint and production build pass; added checks cover resource source requirements and the exact priority equation. Optional FastAPI deployments must apply both new migrations before restarting.
