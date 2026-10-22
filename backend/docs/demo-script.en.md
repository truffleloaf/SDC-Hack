# Pivott demo script (about 3 minutes)

[中文版本](demo-script.md) · [Architecture](architecture.en.md)

## Before presenting

1. Install dependencies and run the frontend test/type/build commands plus backend pytest from the root README.
2. Run the app with `vercel dev --local` so `/api/*` reaches FastAPI. Use the printed `localhost` address, not an unconfigured hostname alias.
3. Run `python scripts/smoke_vercel.py` against that origin. Close unrelated tabs and notifications.
4. Confirm `/api/health`: version `2026.10.2`, cut-off `2026-10-01`, counts 6 roles / 31 tasks / 15 skills / 20 signals. The seed also includes 4 SDGs, 25 resources and 2 scenarios.

No account, database or application key is needed. If you run only `pnpm dev`, explicitly say the verification is using the Next.js API implementation rather than FastAPI.

## 0:00–0:30 — Start with work, not a job-loss prediction

On the landing page, explore the task illustration and point out the data-driven Finance Admin → Operations Coordinator route. Say: “These are illustrative task-exposure estimates, not a probability of losing a job.”

Click **See a 30-second example**. Aisyah's Finance Admin demo opens on the map, with her own demo label. A personal profile is saved separately and can be restored using Exit demo.

## 0:30–1:10 — Explain and verify the task map

In Normal, exposure is about **61.9%** (shown rounded to 62%). Point to invoice entry (about 82.2%, Automate) and exception handling (about 36.0%, Protect because it relies on judgment). Bubble size describes time share; filled area describes exposure.

Click **Verify with API**. Expect:

```text
Matches API: 6/6 tasks, role exposure matches, route order identical.
```

Explain that the check sends task and skill inputs only when clicked, and omits display name and learning progress. FastAPI validates and recomputes the scores without storing a profile.

Switch to **Fast**: overall exposure rises to about **76.4%**. Verify again. This is a recalculation using a different scenario multiplier, not a cosmetic label change.

## 1:10–1:50 — Choose a route and make a plan

Switch back to **Normal**, then open routes. The default ranking is:

1. Operations Coordinator — **58.78912**.
2. Finance Systems Analyst — **58.28684**.
3. Marketing Executive — **52.24559**.

Open **Why this score?** to show fit, skill coverage, target exposure and gaps. In Fast the first two swap: Finance Systems Analyst 55.49684, Operations Coordinator 55.14412. Both outcomes are deterministic; changing scenarios does not guarantee employment.

For a consistent default story, stay in Normal and build the top Operations Coordinator plan. At the default **6 hours/week**, it has **4 steps**, **48 estimated learning hours**, and **8 weeks**. Adjust hours/week, turn on **Free resources only**, and show the practical deliverable and stored learning resource for a step. Every skill has a free option.

Selecting Finance Systems Analyst is a valid alternative, not the Normal default. Its seed plan is 90 hours / 5 steps / 12 weeks at 8 hours/week, as covered by the backend golden fixture.

## 1:50–2:15 — Take the plan with you

Open the passport. Its destination should still be **Operations Coordinator** if you kept the default route. Show PNG/PDF export, copy summary, and calendar export from the pathway.

Be explicit: the passport is a demo summary, not a certified or externally verifiable credential; its reference and QR-like decoration are illustrative.

## 2:15–2:45 — Show a custom signal and real API parity

Open **Signals → Admin**. Add a short signal with a real source you have checked, choose a date no later than the dataset cut-off, and affect a task that is not already clamped at 100% in the chosen direction. New signals are user evidence, not automatically verified research.

Click **Recompute task map**, return to the map and click **Verify with API** again. Check Normal and Fast if time permits. Applied signals are included in both computations; pending signals are excluded. Custom tasks are also validated and scored by both API implementations.

## 2:45–3:00 — Evidence and limits

Show the frontend and backend test results, `tests/golden.json`, and the CI workflows. The current suites include free-resource coverage for all 15 skills, both scenarios, custom inputs, invalid requests, and CORS checks. All scoring is formula-based, with no LLM or random score.

Close with the scope: six illustrative roles, editorial base values, no live labour-market feed, and estimated learning durations. The tool supports a career conversation; it does not forecast an individual's employment.

## Fallbacks and questions

| Situation | Response |
| --- | --- |
| Verification network request fails | Show the clear retry message and continue using local calculations. Do not claim the API matched. |
| A signal changes no score | The task may already be clamped at 0 or 100%. Choose an unclamped task or explain the bound. |
| Combined services cannot start | Run the standalone Next.js app and disclose that verification uses its API implementation. |
| Need direct API evidence | Run FastAPI locally and use its `/docs` or `/api/health`; public Vercel routing does not expose Swagger. |
| Limited time | Demo → map → Verify with API → top route → pathway; show test results. |
| Asked about storage | Browser-local profile/progress; stateless, opt-in API comparison. No database. |
| Asked about security | Public demo, explicit CORS allowlist, no application auth/rate limiter; hosting-edge controls are still needed. |
