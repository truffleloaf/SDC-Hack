# Account sync setup

Guest use and local résumé import need no Supabase connection. Sign-in controls appear only when the public connection settings are supplied. The app supports email codes and Google, and syncs profile changes after sign-in. The sign-in dialog states that behaviour before authentication.

## Project owner checklist (required for live sign-in)

These settings require access to your Supabase, email-provider, Google Cloud and Vercel accounts. Code changes and simulated tests do not apply them.

- [ ] **Custom SMTP:** configure Resend, Brevo, Postmark or SES in Supabase Auth. The default sender has restrictive team-address and rate limits; it is unsuitable for public judges. Check the current limits in [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp). Test delivery to a non-team address.
- [ ] **Email template:** replace the Magic Link email body with [`templates/magic-link-code.html`](templates/magic-link-code.html). It displays `{{ .Token }}` as a six-digit number and contains no sign-in link. Subject: `Your Pivott code`. Body: the six-digit token, a ten-minute expiry statement, and a sentence saying to ignore the email if it was not requested. A code avoids mail scanners consuming a sign-in link.
- [ ] **OTP settings:** set Email OTP expiry to **600 seconds** and confirm six-digit tokens. The UI's stated ten-minute expiry depends on this setting. Configure appropriate server-side request/verification rate limits; the 60-second client resend countdown is only a convenience.
- [ ] **Google:** create a Web OAuth client in Google Cloud. Add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorised redirect URI. Enable the Google provider in Supabase and enter that client ID and secret there. Keep the secret out of the frontend and repository. Configure the Google consent screen for the audience you intend to admit.
- [ ] **Pivott redirects:** set Site URL to `https://pivottstudio.vercel.app`. Allow that production origin's `/signin` return handler and `http://localhost:3000/signin`, including their safe `next` query values (a scoped `/signin**` allowlist pattern can accommodate the query). Add other local ports or preview origins only when needed. Pivott allowlists its own return paths; it never accepts an external `next` URL.
- [ ] **Vercel public build variables:** set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the Next.js service, then redeploy. Never use a service-role key in the browser. These requirements are also recorded in the cloud environment settings; supplying values there does not configure Vercel.
- [ ] **Database:** check whether [`migrations/202610230001_profiles.sql`](migrations/202610230001_profiles.sql) is already applied; run it once if needed. It creates owner-only RLS, revision stamps and the authenticated own-account deletion function. Review its limited `SECURITY DEFINER` permission. Keep RLS enabled.
- [ ] **Live checks:** use a fresh incognito window and a non-team Gmail address on a phone. Test both Google and email code sign-in, expiry/resend, cross-browser code entry, sync, conflicts and deletion. Confirm actual SMTP delivery and Google consent before advertising sign-in as ready.

See the official [email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [Google](https://supabase.com/docs/guides/auth/social-login/auth-google) guides. Live provider settings and limits were not verified from this development environment.

## Sync behaviour

- A profile is limited to 256 KiB JSON in the database. Résumé files and extracted text are never uploaded; confirmed catalogue IDs and normal profile fields can sync.
- First sign-in uploads device work to an empty account, or loads saved work onto an empty device. Equal content needs no write. If both versions differ, users choose one from a comparison showing role, task/rating counts and timestamps. Ratings are never automatically merged. Closing that comparison keeps autosave blocked.
- Changes autosave after two seconds while sync is on. The Account page has a pause toggle and explicit fallback save/retry. Revision checks prevent stale devices overwriting newer work. Network failures preserve device state and retry after reconnect.
- Before replacement, the displaced version is saved under `pivott:v1:backup` with its owner, side and a 30-second expiry. Undo restores that version and pauses sync. Account rollback also checks the written revision, so it cannot overwrite a later save. Only the latest backup is retained. A storage failure blocks replacement when a backup is required.
- Example profiles do not sync. Guest JSON export/import provides a no-account backup path. Imports are validated and reviewed before replacing device data; unknown fields are dropped.
- Sign out keeps device work. **Delete my data on this device** clears profile/progress/backups and signs out locally, including Supabase storage keys. It leaves the account copy intact.
- Account deletion requires typing `delete` and removes that auth user and its saved profile through the owner-bound SQL function. The stated device copy remains. There are no uploaded résumé/storage objects in this integration.

## Test boundaries

Run frontend Vitest/type/build checks and backend pytest using the root README commands. `lib/auth/flow.test.ts` covers code send/verify/errors/resend, different addresses, Google and safe returns. `lib/account-sync.test.ts` covers first-sync decisions, owner/expiry-bound backups and profile boundaries.

`scripts/check-account-browser.cjs` drives the actual browser SDK against intercepted synthetic responses. Start a development Next.js server with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://pivott-account-test.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=public-test-fixture-not-a-real-key pnpm dev --hostname localhost --port 3003
```

Never deploy those fixture settings. The script uses external `PLAYWRIGHT_MODULE`, `AXE_PLAYWRIGHT_MODULE`, optional `CHROMIUM_MODULE`/`PIVOTT_CHROMIUM_EXECUTABLE`, and `PIVOTT_TEST_ORIGIN` (default `http://localhost:3003`). It checks code/Google UI, sync/undo/conflicts, failure recovery, deletion and Axe checks at 375/1280px in light/dark. Mocked responses do not validate live email delivery or provider configuration.

The actual SQL migration can be checked against isolated PGlite PostgreSQL:

```bash
npm install --prefix /tmp/pivott-policy-check @electric-sql/pglite@0.5.11
PGLITE_MODULE=/tmp/pivott-policy-check/node_modules/@electric-sql/pglite node scripts/test-supabase-policies.mjs
```

Use two real accounts for live owner-only access checks: anonymous denial; no reads/writes/deletes of another user's profile; first sync; simultaneous edits; offline recovery; pause/undo; sign-out; typed deletion and cascade. Never put real keys, sessions or private profiles in chat, repository, screenshots or test logs.
