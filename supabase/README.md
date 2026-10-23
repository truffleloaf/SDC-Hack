# Optional account saving

Guest use remains available without Supabase. Account saving needs a real project; the application deliberately displays “not configured” until its public connection settings are supplied.

1. Create or use a Supabase project. Enable email sign-in and email-link delivery, with an appropriate production email provider/rate limits.
2. Apply `migrations/202610230001_profiles.sql` once using the project's SQL editor. This creates one profile per user, owner-only row-level access, revision stamping for conflict detection, and a no-argument authenticated account-deletion function. Review the function's limited `SECURITY DEFINER` permission before applying it. Never disable RLS or expose a service-role key in the browser.
3. Set these **Next.js service build-time environment variables** in Vercel (and your local environment for local auth testing):
   - `NEXT_PUBLIC_SUPABASE_URL`: the project's HTTPS URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: its public publishable key. This key is expected in the client bundle; access is restricted by user authentication and database RLS, not by keeping that key secret.
4. In Supabase Auth URL Configuration, add the exact sign-in callback URLs for your deployment and local development (`/signin` at each intended origin). Include Vercel preview origins only when you intend to support them. Use the production site URL as the default. Email-link requests include a safe, allowlisted `next` path; do not redirect to arbitrary destinations.
5. Rebuild the Next.js service, then test the flows below with two test accounts/devices. Public environment changes require a new build.

## Behaviour

- Sign-in uses an email link and PKCE. Open the link in the browser that requested it, or request a fresh link in the other browser. Expired/failed links leave local work intact; resend has a client cooldown and Supabase must enforce server-side rate limits.
- Cloud profiles have a 256 KiB JSON limit. A rejected save leaves device work intact.
- An account is optional. No profile upload runs automatically. **Save to account** explicitly uploads the active personal profile, task/skill inputs, saved routes and plan progress. Demo profiles are not uploaded.
- When an account copy exists, users choose device or account work. Closing or deferring the choice does not authorize replacement. Skill ratings are never automatically merged.
- Saving compares the stored revision. A stale device is asked to reload and choose; it cannot silently overwrite a newer profile. Revisions and timestamps are stamped by the database.
- **Sign out · Keep device work** retains guest data. On a shared device, use the separate Delete my data control to remove it.
- **Delete account and its saved profile** calls the owner-bound database function, deleting that auth identity and cascading its profile. It deliberately keeps the current device profile, as stated in the confirmation. There are no uploads/storage objects to clean up in this integration.
- A lost email address, delivery problem, or missing database migration is an operational blocker; the UI does not claim cloud saving succeeded.

## Required live checks

With account A and B, verify each can read/update/delete only its own profile, and anonymous access is denied. Check first save, refresh, email resend/expiry, sign-out, sign-in with existing guest work, both conflict choices, a revision conflict from two devices, offline save/retry, and deletion. Confirm that account deletion removes both the auth user and its profile while preserving the stated device copy.

These live checks cannot be completed without project settings and a migrated database. Local application tests and any local PostgreSQL policy simulation are separate from live Supabase verification. Never put secret keys or real session tokens in the repository, chat, screenshots or test output.

## Local policy verification

The policy script executes the actual migration against an isolated PostgreSQL-compatible PGlite database. It checks owner-only read/insert/update/delete, anonymous denial, database-stamped revisions, stale-save rejection and own-account deletion/cascade. It does not contact a live Supabase project or validate email delivery.

```bash
npm install --prefix /tmp/pivott-policy-check @electric-sql/pglite@0.5.11
PGLITE_MODULE=/tmp/pivott-policy-check/node_modules/@electric-sql/pglite node scripts/test-supabase-policies.mjs
```

Run the script from the repository root. This optional test dependency is installed outside the checkout and is not shipped with the app.

## Browser conflict checks with simulated responses

`scripts/check-account-browser.cjs` drives the real Supabase browser SDK against intercepted, synthetic responses. It checks explicit saving, conflict choices, stale revision recovery, failed save/retry, account deletion, the email-link callback return path and sign-out. It uses no real keys or accounts. Start a **development** Next.js server with `NEXT_PUBLIC_SUPABASE_URL=https://pivott-account-test.supabase.co` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=public-test-fixture-not-a-real-key`, then run the script against that local origin. Never deploy these fixture settings.

The scripts use an external Playwright installation via `PLAYWRIGHT_MODULE` and optionally a browser executable via `PIVOTT_CHROMIUM_EXECUTABLE` (or `CHROMIUM_MODULE` for a compatible Chromium launcher). Set `PIVOTT_TEST_ORIGIN` to the running server; the default account-test origin is `http://localhost:3003`. These tests are optional and separate from the required live checks.
