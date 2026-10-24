# Data sources and refresh process

This document identifies the public and synthetic inputs used by Pivott, their licences or provider terms, and how committed snapshots are refreshed.

| Source | Use in Pivott | Licence or terms | Current boundary |
|---|---|---|---|
| [O*NET® 31.0 Database](https://www.onetcenter.org/database.html), U.S. Department of Labor, Employment and Training Administration | Occupation titles, tasks and skills used to build the live catalogue | [CC BY 4.0](https://www.onetcenter.org/license_db.html). O*NET® is a trademark of the U.S. Department of Labor, Employment and Training Administration. | U.S. occupation data does not establish Malaysian demand. |
| [Arbeitnow Job Board API](https://www.arbeitnow.com/blog/job-board-api) | Dated public job listings and count-derived demand observations | Public API terms and attribution are supplied by the provider; Pivott retains the listing URL. | The feed mainly covers Germany and is a weak proxy for Malaysia. |
| [United Nations Sustainable Development Goals](https://sdgs.un.org/goals) | Official goal names and identifiers | United Nations source material | Role and skill mappings are Pivott team judgement, not an official UN classification. |

The built-in Aisyah persona, sample ratings, task shares and illustrative signals are synthetic. Résumé fixtures in tests are synthetic, and uploaded résumé files are read in the browser without being committed or sent to the catalogue refresh process.

The deployed catalogue snapshot is dated **24 October 2026**. It contains 20 roles, 100 tasks, 18 skills, three scenarios and 17 SDGs; the dated Arbeitnow snapshot contains 347 matched listings. The separate built-in demo is dated **1 October 2026** and contains 8 roles, 39 tasks, 15 skills, 20 signals, 25 learning resources, three scenarios and 17 SDGs.

The scheduled and manually dispatchable [`refresh-live.yml`](../.github/workflows/refresh-live.yml) workflow creates a fresh live database, imports public data, updates dated snapshots, runs the relevant checks and pushes a review branch. A failed source request stops the refresh before tracked output is committed. Reviewers should inspect source changes and counts before merging the data branch.

See [SDG mapping](sdg-mapping.md) for the editorial mapping rule and [`backend/docs/live-data.md`](../backend/docs/live-data.md) for importer details.
