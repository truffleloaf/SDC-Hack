Translation of [demo-script.md](demo-script.md); the Chinese file is the source.

# Pivott three-minute demo script

This document translates the timed walkthrough, exact figures, fallback answers and recovery steps recorded in the Chinese demo script.

The goal is to take judges from “How will AI affect my work?” to “What should I learn next week, and where could that take me?” within three minutes, while allowing every figure to be opened and inspected. All figures below were recalculated from the frontend demo seed and engine when the source was written.

## 0. Sixty-second pre-demo check

- [ ] Start the frontend with `pnpm install && pnpm dev`; open <http://localhost:3000>.
- [ ] Confirm `GET /api/health` returns `status: ok`, `dataset: demo`, `seedVersion: 2026.10.1` and `dataAsOf: 2026-10-01`.
- [ ] Keep only the landing, task map, routes, signals and pathway tabs open.
- [ ] Close notifications and unrelated tabs.
- [ ] Select **See a 30-second example** to enter Aisyah's demo mode and check the Demo badge.
- [ ] If the demo ran before, select **Exit demo** and enter again, or clear `pivott:v1` and `pivott:v1:personal`.
- [ ] Note that the seed contains 20 signals; after the demo, restore it with `POST /api/seed` or a refresh.

The frontend demo needs no `.env`, Supabase, `uvicorn` or `python -m app.seed`. Start FastAPI separately only when demonstrating that service.

## 1. Timeline

| Time | Screen | Action | Script |
|---|---|---|---|
| 0:00–0:20 | Landing | Point to the Living Task Map and select **See a 30-second example** | “Jobs don't disappear in one piece. A job is a bundle of tasks — AI is good at some, bad at others.” |
| 0:20–0:45 | Start | Choose **Finance Admin** and show six tasks and time shares | “Aisyah's work has six task groups, with shares of 30/20/15/15/10/10. We first look at where her time goes.” |
| 0:45–1:30 | Task Map | Read **62% task exposure**, hover **Invoice entry**, then switch Normal to Fast | “This is task exposure, not the probability of losing a job. Normal is 62% and Fast is 76%. Invoice entry reaches 100%, while exception handling still needs people at 46%.” |
| 1:30–2:05 | Career Routes | Keep **Fast**, show three cards, then select **Why this score?** | “Under Fast, Finance Systems Analyst is the closest role: fit 56%, with five skill gaps and 90 learning hours.” |
| 2:05–2:35 | Pathway | Move hours/week to 8, then 12; enable free-only; check the first step | “Eight hours per week takes 12 weeks; 12 hours takes eight weeks. Every step has a real resource, estimated time and deliverable.” |
| 2:35–3:00 | Signals | Open Admin, add a signal, then select **Recompute task map** | “One new signal changes task exposure immediately and highlights the affected task. The value is calculated rather than fixed.” |
| 3:00 | Close | Return to landing | “Don't predict the job. Map the tasks. Route the skills.” |

## 2. Exact figures

### 2.1 Aisyah's six tasks

| Task | Time share |
|---|---:|
| Invoice entry | 30% |
| Bank reconciliation | 20% |
| Exception handling | 15% |
| Month-end reporting | 15% |
| Client communication | 10% |
| Expense claim review | 10% |

### 2.2 Task Map: Normal and Fast

| Task | Normal | Classification | Fast | Classification |
|---|---:|---|---:|---|
| Invoice entry | 82% | Automate | 100% | Automate |
| Bank reconciliation | 69% | Automate | 86% | Automate |
| Exception handling | 36% | Protect | 46% | Protect |
| Month-end reporting | 59% | Augment | 73% | Augment |
| Client communication | 26% | Protect | 33% | Protect |
| Expense claim review | 66% | Automate | 81% | Automate |
| **Overall** | **62%** | | **76%** | |

The classification thresholds are `Automate = exposure ≥ 65% and judgment < 40%`, `Protect = judgment ≥ 65%`, and `Augment` otherwise. Invoice entry starts at 78%; Fast multiplies it by 1.25 to reach 97.5%, then signals add 4.2 points and the result is capped at 100%.

### 2.3 Career Routes

| Scenario | First role | Fit | Target exposure | Score | Gaps | At 6h/week |
|---|---|---:|---:|---:|---:|---:|
| Normal | Operations Coordinator | 62% | 49% | 58.8 | 4 | 8 weeks |
| Fast | **Finance Systems Analyst** | 56% | 46% | 55.5 | 5 | 15 weeks |

Switch to Fast before describing Finance Systems Analyst as the closest route. Under Normal, Operations Coordinator is first. Under Fast, the top two differ by only 0.4 points.

```text
coverage = 0.5868
similarity = 0.4545
fit = 100 × (0.8 × 0.5868 + 0.2 × 0.4545) = 56.0
target_exposure = 0.4576
route_score = 0.7 × 56.0 + 30 × (1 − 0.4576) = 55.5
```

### 2.4 Pathway: 90 hours

| Order | Skill | Current → required | Gap hours |
|---:|---|---:|---:|
| 1 | Process automation | 1 → 3 | 24 |
| 2 | Process design | 1 → 3 | 20 |
| 3 | SQL | 0 → 2 | 24 |
| 4 | ERP systems | 3 → 4 | 14 |
| 5 | Stakeholder communication | 2 → 3 | 8 |
| | **Total** | | **90** |

Six hours per week is 15 weeks, eight is 12 weeks, and 12 is eight weeks. The older “six weeks at eight hours” and “four weeks at 12 hours” figures are obsolete. With free-only enabled, Process design and Stakeholder switch from Coursera to OpenLearn. Automation uses Power Automate / UiPath, SQL uses SQLBolt / Khan Academy, and ERP uses SAP Learning.

### 2.5 Signals: change one value

The Admin form requires a date no later than `2026-10-01`, a headline of at least eight characters, an `https://` source, at least one task, strength 0.1–1 and impact 0.05–0.4.

```text
date: 2026-09-30
headline: A new invoice agent reaches finance teams
source: Demo source · https://example.org/signal
direction: +1
strength: 0.60
impact: 0.15
task: Invoice entry
```

After recomputing under Normal, Invoice entry changes from 82% to 91% and overall exposure changes from 62% to 65%. The Invoice bubble is highlighted for seven seconds; other tasks do not change.

## 3. Fallback answers

**Is the data real?**

“The demo data is synthetic. Of the 20 signals, eight are marked `verified` and 12 `illustrative`; each has a source link and evidence badge. We do not present invented statistics as real. The logic and formulas are complete and can accept 20–30 verified sources.”

**Does an LLM calculate the scores?**

“No. Every score uses a deterministic formula that can be calculated and unit tested. An LLM may generate explanatory text only, with a template fallback.”

**Is 62% a probability of losing a job?**

“No. It is duration-weighted task exposure: the share of work content AI may be able to handle. Pivott does not output a probability of job loss.”

**Why recommend this role?**

Open **Why this score?**, show the substituted `coverage`, `similarity`, `fit`, `gap priority`, `weeks` and `route score` values, and explain that Normal and Fast can change the ranking.

**What about privacy?**

“The demo needs no account. Profile, progress and custom signals stay in browser localStorage. Delete my data clears `pivott:v1` and backup keys.”

## 4. Recovery plan

| Failure | Response |
|---|---|
| Frontend does not open | Call `GET /api/seed` and `POST /api/analysis`, or use the prepared screenshots |
| Page state is wrong | Select **Exit demo**, enter again, or clear localStorage |
| Adding a signal fails | Skip the live write and show prepared before/after output |
| Time runs short | Show Landing → Task Map → Routes, then close; keep Pathway and Signals for questions |
| A judge asks for code | Open `lib/engine.ts` and `lib/data/seed.ts` and show formulas, thresholds and seed data |
| A judge asks why there is no database | Explain that the demo uses a read-only catalogue and browser state; the data model supports Supabase when shared use is needed |

## 5. After the demo

- [ ] Delete the user signal on Signals, or call `POST /api/seed`.
- [ ] Select **Exit demo**, or clear `pivott:v1` and `pivott:v1:personal`.
- [ ] Stop the frontend process.
- [ ] Record seed version `2026.10.1` and `dataAsOf` `2026-10-01`.

## 6. Thirty-second version

“AI does not replace a job all at once; it affects some of its tasks. Pivott breaks a role into tasks, estimates which tasks are exposed and which skills remain useful, identifies nearby roles, and creates a weekly learning path. Each figure opens to its formula and source. We provide a next step rather than predicting job loss.”

## 7. Figure check

- 6 roles, 31 tasks, 15 skills, 20 signals, 24 resources, 4 SDGs and 2 scenarios.
- Aisyah: Finance Admin, six tasks, Normal 62%, Fast 76%.
- Fast ranks Finance Systems Analyst first at 56% fit; Normal ranks Operations Coordinator first at 62% fit.
- The FSA path is five steps and 90 hours; eight hours/week is 12 weeks and 12 hours/week is eight weeks.
- The older figures “five task groups”, “only SQL and automation gaps”, “six weeks at eight hours” and “four weeks at 12 hours” are obsolete.
