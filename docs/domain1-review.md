# Review branches

All branches are pushed. GitHub API requests returned Forbidden, so no pull requests could be created automatically. Open these compare links in order to create one review per section. Each section is based on the preceding branch and includes its validation notes in `domain1-report.md`.

| Review | Base → head |
| --- | --- |
| Carryover: Briefs 2–3 | [main → personal-tool integration](https://github.com/truffleloaf/SDC-Hack/compare/main...codex/pivott-briefs-2-3?expand=1) |
| S1 trends | [carryover → S1](https://github.com/truffleloaf/SDC-Hack/compare/codex/pivott-briefs-2-3...codex/domain1-s1-trends?expand=1) |
| S2 source integrity | [S1 → S2](https://github.com/truffleloaf/SDC-Hack/compare/codex/domain1-s1-trends...codex/domain1-s2-source-integrity?expand=1) |
| S3 SDGs | [S2 → S3](https://github.com/truffleloaf/SDC-Hack/compare/codex/domain1-s2-source-integrity...codex/domain1-s3-sdgs?expand=1) |
| S4 pathway | [S3 → S4](https://github.com/truffleloaf/SDC-Hack/compare/codex/domain1-s3-sdgs...codex/domain1-s4-pathway-resources?expand=1) |
| S5 scenarios | [S4 → S5](https://github.com/truffleloaf/SDC-Hack/compare/codex/domain1-s4-pathway-resources...codex/domain1-s5-scenarios?expand=1) |
| S6 audience/options | [S5 → S6](https://github.com/truffleloaf/SDC-Hack/compare/codex/domain1-s5-scenarios...codex/domain1-s6-story-and-options?expand=1) |
| S7 fairness/integration checks | [S6 → S7](https://github.com/truffleloaf/SDC-Hack/compare/codex/domain1-s6-story-and-options...codex/domain1-s7-human-choice?expand=1) |

No branch was merged and no production deployment was triggered by this work. After review/merge, the weekly/manual workflow can fetch public data with GitHub's built-in token. Nonzero trends require enough genuine history. Live course entries still need exact-page verification. The six-digit email flow needs the supplied Supabase email template applied by the project owner.
