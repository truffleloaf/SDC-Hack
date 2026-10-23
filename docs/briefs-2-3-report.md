# Briefs 2 and 3 implementation log

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
