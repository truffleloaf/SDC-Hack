# Domain 1 implementation and verification

This record summarizes the implementation evidence and limitations captured during the Domain 1 work.

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

## S5: scenarios and confidence

Slow (0.75×), Normal (1×) and Fast (1.25×) are explicit team assumptions. Routes display all three ranks/scores, overtaking notes, a min–max score range and “Estimates, not predictions.” Confidence opens to show rated requirements, relevant dated published signals within 180 days of the snapshot, scenario spread and the exact rules. Route cards, map overview and passport also show scenario uncertainty. The adoption preview includes Slow, and both APIs/account validation preserve it.

Validation includes a new cross-language Slow golden, API Slow checks, comparison/rank consistency and identical TS/Python confidence boundary cases, plus the full lint/test/build suites.

## S6: audience, sample and options

The landing page focuses on clerical/finance workers in Malaysia and gives fresh graduates a separate entry point. Aisyah is an explicitly synthetic bookkeeping profile using live catalogue IDs; it remains separate from personal work and never syncs to an account. The sample walkthrough is profile→radar→route. Local résumé privacy and synthetic-only demo guidance are visible. `/method` explains the sources, dates, deterministic scoring, geographic limits and hardest risk/fallback.

Job browsing supports keyword, role, location, remote and sorting filters. The refresh exports up to 100 genuine public postings per matched role. The old repository snapshot contains no posting records, only aggregate counts, so this environment cannot populate the listing page without the blocked feed; the page says so. Route count (3/5/10), SDG priorities, ratings, editable tasks, work/study hours and resource filters provide customization without introducing recruitment or payment features.

## S7: human choice and fairness

Routes, pathway and passport state that suggestions inform the user's own decision and do not make hiring decisions. The method explains excluded demographic inputs and the remaining limits of source/model bias. Regression tests check the scoring request schema, name/demographic invariance in TS and FastAPI, and a fully synthetic résumé fixture whose demographic fields never enter saved profile state. These checks do not claim population-level fairness.

S8 is intentionally deferred: verified live trend history and course resources remain dependent on network/source access. No unreviewed Malay translation or employer view was added.

## Final integration verification

- 123 frontend tests, 139 backend tests, type/copy lint and production build pass. Generated seed/golden fixtures are current.
- Live production browser checks: 36 page/width/theme combinations (375/1280, light/dark), Axe WCAG 2A/AA and 2.1AA, no horizontal page overflow or browser exceptions. Sample profile, SDG focus, 3/5/10 route control, baseline toggle and listing filters were exercised. Screenshots were inspected.
- An isolated PostgreSQL test executes the schema and migrations, verifies all-goal/Slow/assumption support, and rejects invalid goal IDs. No live database was changed.
- Malformed feed dates are skipped rather than replaced with today; unsafe listing URLs are skipped. Refresh recovers prior observation history from the data branch before fetching, so baseline coverage can accumulate across weekly runs.
- The source-access and email-template boundaries above remain. The site has not been claimed deployed or tested against live SMTP.

The listing page also supports a user-triggered runtime fetch of five public board pages through the same-origin API. No profile data is sent. Successful public rows replace the in-memory listing view; failed requests preserve it and show an error. Parser tests and browser fixtures cover deduplication, source dates/URLs, successful refresh and failure retention. Real feed retrieval remains blocked in this development environment; no live-posting count is claimed.
