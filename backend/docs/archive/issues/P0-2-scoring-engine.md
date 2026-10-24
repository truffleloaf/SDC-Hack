Historical log. Not maintained.

# P0-2: Scoring engine

This archived work package introduced the Python implementation of the deterministic scoring model.

## Scope

- Calculate signal recency and bounded task-exposure adjustments.
- Calculate weighted role exposure and task classifications.
- Calculate skill coverage, task similarity, route fit, gaps, pathway duration, and route scores.
- Match TypeScript golden outputs under Slow, Normal, and Fast scenarios.

## Acceptance

Formula unit tests pass, identical inputs produce identical outputs, scenario changes are visible, and the Python and TypeScript engines agree on golden profiles. Current formulas are documented in [architecture.md](../../architecture.md).
