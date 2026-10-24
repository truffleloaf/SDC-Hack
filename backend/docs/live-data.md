# Live catalogue and job data

This document explains the public sources, mappings, refresh process, and limitations of the live dataset.

## Sources

| Source | Use |
|---|---|
| O*NET 31.0 | Occupation titles, tasks, skills, importance, and work activities |
| Arbeitnow public API | Dated job listings and count-derived demand observations |
| Adzuna | Optional job source when credentials are supplied |
| United Nations SDG list | Official goal names and identifiers |

O*NET is licensed under CC BY 4.0. O*NET is a trademark of the U.S. Department of Labor, Employment and Training Administration. Arbeitnow links are retained for attribution.

## Mapping

The importer maps reviewed O*NET occupations into Pivott roles, normalizes task shares, connects tasks to catalogue skills, and stores provenance. Job titles are matched through reviewed aliases. Unmatched or malformed records are omitted instead of being guessed.

Task base exposure and human-judgment values are Pivott model outputs. They are not O*NET measurements and are not probabilities of job loss.

## Run a local import

From backend:

    PIVOTT_DATASET=live
    PIVOTT_DB=sqlite:////tmp/pivott-live.db
    PYTHONPATH=.
    python -m app.live sync

Optional Adzuna variables are ADZUNA_APP_ID, ADZUNA_APP_KEY, and the configured country.

## Live endpoints

- GET /api/live/status returns dates, source status, counts, and trend readiness.
- GET /api/live/jobs filters public listings by role and limit.
- GET /api/seed returns the imported catalogue without a demo persona.

## Count-derived trends

Trend direction compares recent and baseline posting counts for a role or skill. Duplicate listing IDs are removed, future dates are rejected, and insufficient windows produce no trend. These counts describe the imported feed and do not establish labour-market demand for Malaysia.

## Refresh workflow

The scheduled [refresh-live.yml](../../.github/workflows/refresh-live.yml) workflow imports into a fresh temporary database, writes dated metadata and the web snapshot, runs checks, and pushes a review branch. A source failure stops before tracked output is replaced.

## Limits

O*NET describes U.S. occupations and Arbeitnow mainly covers Germany. Title matching can miss local wording. Public feeds can be incomplete or temporarily unavailable. Pivott shows source dates and uncertainty rather than treating this catalogue as a Malaysian forecast.
