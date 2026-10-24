# Domain 1 requirements

This matrix connects each Future-Ready Workforce requirement to visible evidence, implementation code, automated checks and a stated limitation.

| Requirement | App evidence | Code | Automated evidence | Limit |
|---|---|---|---|---|
| Skills intake | `/start`, `/skills` | [`components/start/`](../web/components/start/), [`lib/resume/`](../web/lib/resume/) | [`resume.test.ts`](../web/lib/resume/resume.test.ts), [`personal-tool.test.ts`](../web/lib/personal-tool.test.ts) | Résumé matching is local phrase matching. It is not an LLM assessment or ATS score. |
| AI trend signal layer | `/signals` | [`lib/catalog.ts`](../web/lib/catalog.ts), [`backend/app/live/trends.py`](../backend/app/live/trends.py) | [`trends.test.ts`](../web/lib/trends.test.ts), [`test_trends.py`](../backend/tests/test_trends.py) | Thin or missing history produces an explicit insufficient-data state instead of a trend claim. |
| Future-role matching | `/routes` | [`lib/engine.ts`](../web/lib/engine.ts), [`backend/app/engine.py`](../backend/app/engine.py) | [`engine.test.ts`](../web/lib/engine.test.ts), [`test_engine.py`](../backend/tests/test_engine.py) | Fit is an explainable estimate based on selected tasks and rated skills; it is not a hiring decision. |
| Reskilling pathway | `/pathway` | [`components/pathway/`](../web/components/pathway/), [`backend/app/services/pathway.py`](../backend/app/services/pathway.py) | [`resources.test.ts`](../web/lib/resources.test.ts), [`test_api.py`](../backend/tests/test_api.py) | Hours are planning estimates. The app identifies when a suitable verified resource is unavailable. |
| SDG mapping | `/routes`, `/pathway`, `/passport` | [`backend sdg-map.json`](../backend/app/data/sdg-map.json), [`frontend sdg-map.json`](../web/lib/data/sdg-map.json) | [`sdg.test.ts`](../web/lib/sdg.test.ts), [`test_sdg.py`](../backend/tests/test_sdg.py) | Mappings cover all 17 goals but remain team judgement, not an official UN classification or measured impact. |
| Handling uncertainty | `/map`, `/routes`, `/method` | [`lib/engine.ts`](../web/lib/engine.ts), [`lib/preview.ts`](../web/lib/preview.ts) | [`scenarios.test.ts`](../web/lib/scenarios.test.ts), [`fairness.test.ts`](../web/lib/fairness.test.ts) | Slow, Normal and Fast make assumptions visible; none is a forecast or probability of job loss. |

The implementation uses synthetic demo profiles and attributed public data. It stores no real CV in the demo, does not invent job listings, courses or statistics, cites sources for recommendations where a source exists, and leaves career decisions with the person using the tool. The detailed validation history is in [verification.md](verification.md).
