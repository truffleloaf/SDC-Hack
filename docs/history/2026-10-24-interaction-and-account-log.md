Historical log. Not maintained.

# Interaction and account implementation log

Base: `main` at `20bf696`, including résumé import (PR #7). Work branch: `codex/pivott-briefs-2-3`.

Brief 3 amendments take precedence: no looping bubbles, global page fade, automatic hero cycling, arrival burst or extra travel terminology. Work order is S, T, U, then the remaining A, B, C, D items. Overlapping fixes are recorded once. Each item has its own commit. Required test/build and responsive/theme checks run at each part boundary, with results appended here before the next part.

## S1: email-code dialog and Google

Implemented a shared sign-in dialog, email-code send/verify/resend, six-digit paste/auto-submit, masked addresses, inline errors and Google OAuth. `/signin` handles OAuth return and opens the dialog for direct visits. Current-page email sign-in retains context; OAuth uses an allowlisted return path. The pure `SignInFlow` controller fences results when a dialog closes or changes method.

Files: `lib/auth/flow.ts`, `components/account/sign-in-dialog.tsx`, `app/signin/page.tsx`, provider/header/workspace entry points. Type checking passed. Functional/auth and responsive/theme verification follows in S5 before the Part S report.

Supabase settings are absent from this machine. The secure configuration requirements remain declared in the environment settings. No live SMTP, Google credentials or Supabase project access is available. A direct request to the SMTP documentation was blocked by network access, so live provider behaviour is not claimed. Owner configuration and external-address checks will be listed under S6.

## Remaining work

S2 sync/backup/undo; S3 account/backup/deletion/header; S4 contextual prompts/progress; S5 auth/sync/browser/accessibility tests; S6 owner checklist. Then T1–T6, U1–U3; remaining A1–A10, B1–B4 (B5 dropped), C1–C4/C6 (C5 state path only, no celebration), and D. Items already fixed or refuted will be identified explicitly.

## S2: first sync, autosave and undo

Implemented content-based reconciliation for empty/equal/different profiles, revision-checked saves, two-second autosave, reconnect retry, per-account pause preference and a compact version comparison. Replacements create an owner-bound 30-second device backup before writing; Undo pauses sync and uses the written revision when restoring the account. Closing the comparison leaves sync blocked. Example profiles do not sync. Files: `lib/account-sync.ts`, account provider. Type checking passed; behavioural and browser verification is scheduled for S5.

## S3: account, backups, deletion and mobile header

Added guest JSON export/import with validation and a review dialog; signed-in sync toggle and fallback save/retry; typed `delete` account confirmation; local session cleanup when deleting device data. The header now uses an account avatar/menu with email/status and exposes Work/Signals in the compact menu on phones. Sign-in and workspace sync promotion are hidden when unconfigured (also A5/A6/A7). Replaced native confirmations in task restore and résumé replacement, in addition to the account flow (A10 confirmation sub-item). Imported profiles drop unknown fields. Files: account panel/provider/data boundary, header/store/workspace, `ConfirmDialog`, task picker, résumé importer. Type checking passed; Part S functional and 375px/1280px theme checks follow in S5.

## S4: contextual sign-in and progress feedback

Added a dismissible sync note on chosen routes and plans, suppressed for examples, configured-out deployments, signed-in users and repeat visits in the same session. Dismissal persists on the device. Completing a learning step offers an explicit rating increase to the role's required level; declining leaves the rating untouched. Workspace leads with the next step and its stored hour estimate. Files: `SyncNote`, routes/pathway/workspace. Type and browser checks are included at the S5 part boundary. No automatic proficiency claim is made.

## S5: auth, sync and accessibility verification

Added 86 frontend tests in total, including auth state transitions, recovery expiry, reconciliation and backup boundaries. Expanded the browser script for actual SDK requests against synthetic endpoints: code errors/resend/keyboard, Google handoff/return, first sync, conflicts, rollback, JSON import/export, optional rating changes, offline retry and local session deletion. Axe passed at 375px and 1280px in light and dark. Removed header and dialog/sheet backdrop blur early from T2 because software-rendered browser checks stalled on it; the solid surfaces also match the requested design.

Files: auth/sync helpers and tests, provider/dialog guards, header/dialog/sheet surfaces, browser script/helper. Verification: frontend **86 passed**; TypeScript passed; production build passed; backend **66 passed**; all eight browser groups passed. These are synthetic auth checks, not proof of live SMTP or Google configuration. Supabase sometimes combines invalid/expired OTP errors, so the UI gives a combined next action when the server cannot distinguish them.

## S6: owner configuration checklist and Part S result

Updated root/frontend READMEs and `supabase/README.md` for the code flow, autosave and recovery. All eight external setup checks remain **owner-unverified**: custom SMTP/non-team delivery; token email template; 600-second OTP expiry; Google credentials/consent; redirect allowlist/Site URL; Vercel public build variables/redeploy; SQL migration application; real phone/incognito verification. Verify the migration's applied state before running it again. No project credentials are available here, and no live-provider success is claimed.

Part S is implemented and its required checks passed (S5). Remaining work: T1–T6, U, then A/B/C/D items not already covered. No features were removed. Résumé import remains local and available.

## T1: evidence and assumptions

Converted the 12 invented news records into undated, unlinked assumptions with no organisation names. The timeline contains published/user entries only; a separate section shows assumptions and their per-task point contributions. Engine/API sorting, confidence explanation, badges and admin help reflect the distinction. Existing eight published references were retained, not newly verified; network access does not support claiming new source checks.

Both engines use a fixed assumption weight equal to the previous strength × cut-off recency. This removes invented dates without changing scores at the data cut-off. Seed and goldens regenerated; custom-signal fixtures now start from a dated published entry. Added regression coverage for absent publication metadata and preserved demo scores. Full checks follow at the Part T boundary.

## T2: typography and surfaces

Loaded four local IBM Plex Sans weights with `next/font/local`; tabular numerals align data. Removed the hero eyebrow, split-colour headline, rings, glow and numbered card grid. Added a plain tools list and privacy sentence. Solid surfaces replace glass everywhere. Cards use 12px corners, controls 8px; data circles and status/filter pills retain their meaning. Empty states are left-aligned without icon ornaments. Shared primitive tokens/shadows and the font example were updated; DESIGN records the decisions. Fake QR was already absent; removed the remaining reference number. The passport light scope is still required for exports.

Files: root layout/CSS/landing, states, shared primitives, panel/control consumers, passport and styleguide. Type checking passed before the final shadow-token substitutions. Responsive/theme and full checks run at the Part T boundary.

## T3: specific copy

Rewrote the hero, metadata, start, skills, signals, plan, passport, time panel and error/empty state copy. Removed name greetings and prose em dashes; table placeholders remain. Classification definitions now use a definition list. Account name help describes autosync accurately. The skills sentence explicitly says unknown ratings are excluded from learning gaps; the fit-range implementation in A1 will bound their possible contribution instead of claiming they never affect comparisons. Files: the corresponding pages/components and comments. Full validation follows at the Part T boundary.

## T4: one explanation and a method page

Kept the requested exposure statement on Map and linked it to the new `/method` page. The global footer and passport footer also link there. Removed repeated illustrative/disclaimer labels from the map, hero details, plan completion, example and passport. Evidence badges and useful unknown/assessment coverage information remain because they describe inputs, rather than repeating warnings. Method documents formulas, thresholds, fixed assumptions, confidence, learning estimates and data handling. Files: method/layout/footer and corresponding copy consumers. Full checks follow at the Part T boundary.

## T5: learning context from actual inputs

Removed every skill `why` claim and replaced pathway `why` with numeric current/required levels in both engines. Step cards derive task count/names from the selected tasks (including edited names) and show the target requirement alongside the rating. Concrete deliverables remain; customer notes now name interview output directly. Seed and goldens regenerated. Added regression coverage against promotional fields and incorrect levels. Files: seed, both engines, step card, pathway, engine tests and fixtures. Full checks follow at the Part T boundary.

## T6: unused assets and motion cleanup

Deleted placeholder images and unused legacy app icons; retained the referenced SVG icon and all four now-used Plex files/license. Removed disabled float/dash keyframes, unused dot-grid fade and route-flow classes. No floating loop, auto-cycle, global page fade or celebration was added. The passport light scope remains in use by exports and is not dead code. Banned-word search found only a PDF orientation enum (`landscape`), test fixtures and a developer comment, with no promotional UI prose. Files: public assets, CSS, graph class/prop names. Full Part T verification follows.

## Part T verification

Frontend **89 passed**, backend **66 passed**, TypeScript and production build passed, seed/golden freshness passed. New `scripts/check-briefs-browser.cjs` checks ten affected pages at 375/1280px in light/dark with Axe, overflow checks, screenshots and browser-error collection: **all 40 page/theme/width combinations passed**. Manual screenshot review caught a wrapping percentage; made it non-wrapping. Axe caught low contrast on mint/subtle surfaces; darkened the existing slate text token slightly to meet 4.5:1. Rebuilt and reran the full browser matrix after those fixes. No new source claims, decorative motion or credential graphics were added. Part T complete; proceeding to U.

## U1: design rules

DESIGN now explicitly limits motion to state changes, attention and data, with reduced motion support. It prohibits decorative gradients/glows/blur/icon grids and clarifies graph exceptions. T2 already recorded fonts, radii and accent rules. Documentation-only; part verification follows U3.

## U2: enforced copy checks

Added a TypeScript-AST copy checker for app/components (excluding styleguide), covering prose em dashes, banned phrases and native browser prompts. A preceding/same-line `// copy-lint-ok: reason` permits deliberate exceptions. CI runs both its positive/negative self-test and the repository scan; both passed. Workflow path filters include the checker. Files: script and frontend workflow.

## U3: copy guidance

Added the Copy rules section to DESIGN, including concrete sentences, no rhetorical headings/negative parallels, one linked disclaimer and meaningful use of names. Documents the checker and reasoned exceptions. Documentation-only; required Part U checks follow.

## Part U verification

Checker self-test and UI scan passed. Frontend **89 passed**, backend **66 passed**, TypeScript and production build passed again. U changes only documentation, the checker and CI; the unchanged UI retains Part T's 40 passing responsive/theme/accessibility checks. Part U complete. Before A1, reproduced the reported bug directly: Excel-only Finance Systems Analyst fit **89.09%**, versus **56.04%** with the full demo ratings. Proceeding with conservative bounds.

## A1: conservative partial fit

Reproduced the inflation before fixing it (Part U result). Both engines now compute fitLow/fitHigh and importance-weighted ratedShare; fit remains a compatibility alias for fitLow, which drives ranking. Cards, comparison, formula sheet and passport show ranges until all required skills are rated. Unknown ratings remain absent from learning gaps. Added the Excel-only regression in both languages and the fully rated collapsed-range check; regenerated goldens. Remote verification reads route IDs only, so its response parser needs no change. Updated Method to explain bounds. Backend **67 passed**; frontend checks follow the old coverage-test expectation update and Part A boundary. No fully rated demo scores change.

## A2: editable number drafts

Confirmed both time-share and study-hour fields committed numbers on every keystroke and rejected an empty draft. Added shared NumberField: clearing is allowed during editing, blur/Enter clamps and commits, invalid input restores the current value. Applied to TaskPicker and Workspace. Files: NumberField and both consumers. Browser coverage at the Part A boundary will clear, replace and clamp both fields.

## A3: touch selection

Confirmed the hero used mouse-enter state as the click toggle input. Split mouse-pointer hover from persistent tap/click pinning; keyboard focus remains a temporary preview and Enter/Space toggles the pin. Escape clears both. File: LivingTaskMap. Chromium touch emulation is included in Part A verification; a physical phone is unavailable here.

## A4: returning visitors stay on the landing page

Confirmed the effect redirected personal profiles to Workspace. Replaced it with a dismissible continue/start-fresh banner. Fresh start uses the recovery backup and pauses signed-in sync before a new plan can autosave. No forced redirect remains; `/?welcome=1` still opens the landing page. Added the requested presentation note. Files: ResumeWork, provider replacement message, root README. Browser verification at the Part A boundary covers landing retention, dismissal, fresh start and Undo.

## A5–A7: already completed in S3

Configured-only sign-in/workspace promotion, compact phone navigation and local session deletion were implemented and verified in S3/S5. No duplicate implementation commit is needed.

## A8: disclose renamed templates

Confirmed names are display-only while estimates retain reference task values. Map detail cards (including mobile sheet) and list rows now name the source template whenever the displayed name differs. Files: task map/list. No formula or API shape changed. Part A browser checks cover a renamed Invoice entry.

## A9: immediate signal application

Removed the reproduced 900ms timer and its pretend processing state. Applying signals computes before/after values synchronously and immediately updates state. The existing change list remains; C4 will visualise it on Map. File: signals page. Part A/C4 browser checks cover the action.

## A10: persistence, reused analysis and page fallbacks

Passed the memoised Map analysis into API verification (including its comparison), avoiding another route computation on render/click. Device writes now debounce for 150ms with immediate in-memory updates, flush pending work on pagehide, and cancel pending writes when replacing/deleting state or accepting another tab's storage update. Added meaningful timer/flush/deletion tests. Storage deletion failures now surface in the confirmation dialog instead of claiming success.

Added root error/loading/not-found states and a real generated PNG Open Graph image. Native confirmations were already replaced in S3; Plex files are used and unused assets/CSS were removed in T6. Fresh-start text now distinguishes guests from signed-in accounts. Files: store/persistence tests, remote/verification/Map, fallback/OG routes and header/welcome error details. Type checking and full Part A checks follow.

## Part A verification

Frontend **93 passed**, backend **67 passed**, TypeScript and production build passed. Copy lint and fresh seed/goldens pass. The expanded matrix passed all **48 page/theme/width combinations**. Added List-view checks caught an escaping absolutely positioned screen-reader header: the scroll container now provides its containing block, with explicit grid shrink constraints. List no longer widens the document. A final Map/List matrix at both widths/themes passed after fixing dark classification-badge contrast.

The new interaction script passed editable drafts/clamps, touch pin/unpin, retained home and fresh-start Undo, renamed template detail/list, real API parity, fit ranges in cards/formula/compare, immediate signals, 360px navigation, generated PNG and not-found. Touch uses actual touch pointer events with fixed viewport coordinates; headless Chromium's mobile visual-viewport panning caused automation interception, so physical phone behaviour remains owner-unverified. No forced clicks bypassed the controls. Updated current READMEs for conservative fit and fixed assumptions. Part A complete; proceeding to B.

## B1: hero data entry, without loops

Hero nodes enter once from the centre with a short stagger and spring; reduced motion renders the final state immediately. Removed the remaining decorative SVG rings. Added a shared MotionConfig respecting the user preference. No floating bubbles, auto-highlight, looping dashes or global page fade was added, following Brief 3. Static connections remain; directional dash animation is optional and was omitted. Files: hero, motion provider/layout; also made OG subcopy a single specific sentence. Full Part B checks follow.

## B2: exposure count-up

The Map headline animates changes through CountUp; initial values and reduced motion render immediately. A separate polite live region receives only the target value, not animation frames. Interrupted animations continue from the displayed value. Files: Map and progress-ring. Full Part B checks follow.

## B3: route reordering

Restored motion.article layout-position springs using stable role keys. Rank changes show a short moved-up/down status for three seconds, based on the prior full order. Reduced motion updates order immediately. Files: route card and routes page. Scenario reordering and reduced-motion browser checks follow at the Part B boundary.

## B4/B5: overlap and amendments

B4 was completed in T2 (local Plex and tabular figures). B5 is explicitly dropped by Brief 3; no global page fade was added.

## Part B verification

Frontend **93 passed**, backend **67 passed**, TypeScript, production build and copy lint passed. Responsive/theme/Axe checks passed across 48 page combinations plus four List views. New motion browser checks passed at 375px/dark/reduced motion and 1280px/light/normal motion: hero selection, final exposure announcement/display, Normal/Fast order change and three-second movement-label expiry. Also made existing exposure/progress bars use zero-duration transitions under reduced motion. No decorative loops or page transitions were added. Part B complete; proceeding to C.

## C1: adoption preview

Added a 1.00–1.50 multiplier slider with two-decimal values and 0.02 preset snapping. Map exposure, filled cores, classifications and the nearby-role order recompute live; non-preset previews remain temporary and hide API verification until a preset is chosen. Normal/Fast retain their verified path. Both engines accept the same optional bounded preview multiplier without changing the existing formula or public API. Added snap, ranking/exposure and cross-language preview golden coverage; fixtures regenerated. Files: preview helper/control, Map/store, both engines, scenario switch, Method, generator/tests. Unit/type/browser results are consolidated at the Part C boundary.

## C2: skill bridge bars

Route cards compare your level and the required level for the three most important requirements. Bars enter once on view; reduced motion is immediate. Unknown ratings use a labelled hatch, never an empty zero bar. Focus/hover reveals the actual level gap and catalogue hours, or asks for a rating. Existing gap and learning details remain. Files: SkillBridge, route card and DESIGN's data-pattern exception. Browser/theme/Axe checks follow at the Part C boundary.

## C3: direct time editing

Added 44px draggable divider targets, pointer capture, left/right keyboard changes (1%, or 5% with Shift) and separator value labels. Only the neighbouring pair changes; other task shares and the total remain fixed. Number fields and sliders remain available. The existing setShare rescales every other task, so a tested adjacent-pair helper is needed for this specific interaction. Files: ShareBar, TimePanel, shares helper and workflow test. Part C browser checks cover drag and keyboard invariants.

## C4: signal before/after

Map now retains a dashed ring at each changed task's previous filled-core size, morphs to the new value and labels the point difference. The SVG's accessible label includes the change. Feedback clears after seven seconds, with the timer reset by actual change content. Reduced motion updates immediately. Imported account/JSON profiles discard this temporary presentation state. Files: task canvas, Map and account boundary. A9 already removed the fake delay. Browser checks follow at the Part C boundary.

## C5: plan progress only

The existing dotted state path and checked skill nodes already show progress. Kept those, explicitly respected reduced motion and removed the animated logo flourish on completion. No arrival burst, passport stamp or extra travel terminology was added, following Brief 3. Files: pathway and step card. Progress/rating browser checks are included in S5 and the final regression run.

## C6: weekly time allocation

Added editable work hours (default 40, separate from study hours), class-hour totals and a segmented bar. It multiplies the existing time shares by work hours; unassessed tasks retain a separate hatched share. The caption explicitly says these are not predicted saved hours. The preference persists/syncs with a validated profile and old profiles default to 40. No scoring formula changes. Files: WorkHours, Map, store/account boundary; also placed the C4 ghost ring above the filled core so it remains visible after increases. Full Part C checks follow.

## Part C verification

Frontend **96 passed**, backend **68 passed**, TypeScript, production build, copy lint and seed/golden freshness passed. The full 48-page matrix and four List views passed. Interactive checks passed at 375/1280px in light/dark: keyboard can leave presets and snaps on completion; temporary previews restrict API verification; skill bars disclose levels/unknowns and actual gap hours; pointer/keyboard divider changes preserve totals and unrelated tasks; signals show the old core and +12-point fixture change; weekly totals include unassessed time.

Corrected the keyboard snap timing during review. Added missing shared tooltip role/description semantics, verified the connection and Axe on open tooltips. Made required/unknown bars visible against both themes. The last synthetic fixture setup was rerun after avoiding a pending-write race; all four variants pass. Part C complete; proceeding to D.

## D1: skill rating controls

Replaced selects with native radio groups for levels 0–4 and Not sure, all with 44px labels and visible focus. The chosen level includes its independence description. Start from my tasks changes the suggested skill set without assigning ability; other skills remain available (automatically expanded if there are no suggestions). Files: SkillCard and skills page. Browser/keyboard/Axe verification follows at the Part D boundary.

## D2: navigation progress

Added Work completion, Skills rated n/15 and Plan progress/partial state, completion ticks and a shared underline that moves between sections. Reduced motion updates immediately. A shared UI progress helper retains a recorded completed step when accepting its skill increase removes the current gap, preventing progress from dropping back to zero. Unknown requirements prevent a complete-plan claim. Pathway and Workspace use the same recorded counts; tests cover rating increases and unestimated plans. Files: stepper, progress helper/tests, pathway/workspace. No scoring formula changed. Full Part D verification follows.

## D3: map classification filters

Added clickable All/Automate/Augment/Protect legend controls with counts and pressed state. They filter the map and list while keeping the full assessment and hour allocation. Empty filters provide an exact reset action; hidden task details close. Custom-only profiles keep an explicit unassessed state. Files: ClassificationFilter, Map and task canvas. Full Part D checks follow.

## D4: mobile details and targets

The mobile detail sheet was already present, so it was retained rather than rebuilt. Added invisible hit circles guaranteeing at least 44px for map bubbles; hero targets are also enlarged at phone widths. Pointer-only hover avoids synthetic touch hover. Detail close and learning-step controls now have 44px boxes. Files: task canvas, hero, step card and decorative stepper-tick semantics. Browser checks follow at the Part D boundary.

## D5: broader references and an honest unlisted path

Added Sales Operations Coordinator and HR Operations Coordinator with eight sample tasks, mirrored in the Python data. The catalogue now has eight reference roles and 39 tasks; these are editorial reference values, with no new evidence claims. A separate own-task profile supports jobs outside the catalogue without forcing a template or assigning exposure. It is not a recommended destination. The dialog keeps the person's title, explains switching, and returns focus to reference search or the own-task control. Added API/profile handling and regression coverage for wholly unassessed own work. Résumé matching includes the new roles' titles/aliases without assigning ratings. Updated current dataset docs; fixtures regenerated. Normal/Fast demo winners remain covered by the existing tests; new roles can change lower-ranked suggestions.

## D6: prior unfinished items and refutations

Method was implemented in T4 and linked from Map/footer/passport. The fake QR was already absent in the base; T2 removed the remaining reference number. Mobile details already used a sheet; D4 enlarged targets. No duplicates of those tools were added.

D6 cleanup also removed the unused passport reference-code field and replaced remaining travel/strength labels with Rated skills, Target role and Learning steps. Existing passport exports remain available.

## Part D and pre-integration verification

All D changes passed on the brief's original backend: frontend **99 passed**, backend **69 passed**, TypeScript, production build, copy lint, freshness and local PostgreSQL policy checks passed. Browser matrix: 48 page/theme/width combinations plus four List views; D interaction flows at 375/1280px in light/dark; résumé extraction/error/privacy regression; email-code/Google, sync, conflicts, backup/undo, deletion and offline fixture tests all passed. Screenshots were manually reviewed; adjusted one colliding hero label. Role changes now render immediately so dialog focus returns to the new own-task control. Skill legends retain headings for navigation.

Latest user steering asks for authentication numbers instead of email links. The six-digit email-code flow is implemented and tested; `supabase/templates/magic-link-code.html` is a link-free template for the owner to apply. Live SMTP/provider configuration remains unverified.

Before publishing, fetched GitHub and found main advanced from `20bf696` to `7b5f60b` through PRs #8–#14, replacing the backend and introducing a live catalogue/committed snapshot. The preceding counts describe the tested original baseline. Integration with the new backend/live catalogue is now required so this work does not revert those updates. Final verification will be recorded separately.
