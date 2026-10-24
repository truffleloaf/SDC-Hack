# Domain 1 implementation and verification

## S1: refreshable trend layer

Count-derived role and skill signals, dated count snapshots, public observation history (90 days), a weekly/manual refresh workflow, Radar thresholds and baseline score/rank comparison are implemented. The workflow writes a reviewable data branch with the built-in GitHub token and needs no custom secret. Feed failure stops the refresh before tracked changes.

**Boundary:** the development environment returns HTTP 403 for Arbeitnow. The older committed snapshot lacks posting windows; the UI explicitly says counts are not computed and produces no invented trends. Live acceptance requiring nonzero signals cannot be claimed until a real refresh has enough history. The current committed `jobs.live.json` is empty because the upstream 85 display postings were in a database that was not committed. Refresh exports real listings for browsing.

**Verification:** lint, frontend tests, production build and backend tests. Fixture tests cover exact counts, direction, strength, equal windows, thin windows, future postings and duplicate IDs. Frontend scoring tests prove signals can change scores.

GitHub REST/GraphQL API calls are blocked (Forbidden), while git push works. Section branches are published for review; PR creation must be completed from GitHub's compare page if API access remains blocked.
