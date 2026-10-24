# Supabase authentication and user data

This guide describes the optional FastAPI authentication boundary and signed-in profile storage.

## Responsibilities

Supabase Auth owns account creation, password verification, email codes, OAuth, password recovery, refresh tokens, and session expiry. FastAPI validates access tokens and provides account-scoped profile endpoints. It never stores passwords.

## Configuration

Set SUPABASE_URL and SUPABASE_ANON_KEY for the optional auth bridge. Set DATABASE_URL to the backend Supabase Postgres connection when profiles should be persisted. Modern projects use the provider JWKS endpoint; SUPABASE_JWT_SECRET is only for legacy HS256 projects.

Browser clients receive only the Supabase URL and publishable key. Keep database credentials and service-role keys on the server.

## Token validation

The backend validates the signature, key ID, issuer, audience, expiry, authenticated role, and subject. Protected endpoints return 401 for a missing, expired, malformed, or invalid token.

## Profile API

- GET /api/auth/config is public and reports whether sign-in is configured.
- GET /api/auth/me returns the verified identity.
- GET /api/me/profile reads the caller's profile.
- PUT /api/me/profile creates or replaces the caller's profile.
- DELETE /api/me/profile deletes the caller's profile.

The request body never selects another user. Revision checks prevent a stale client from overwriting newer work.

## Client choices

The recommended web flow uses @supabase/supabase-js directly and sends the access token to protected FastAPI requests only when API verification is needed. A UI-only client can use the optional signin, signup, refresh, signout, and password-reset bridge endpoints.

The example in [examples/auth-client.ts](examples/auth-client.ts) demonstrates the bridge contract.

## Database security

Apply [202610231200_profiles.sql](../supabase/migrations/202610231200_profiles.sql) after the backend schema. The profiles table has owner-only read, insert, update, and delete policies. The backend still filters every operation by the verified token subject even when its database connection bypasses RLS.

## Verification

Run the backend test suite for token and endpoint coverage. Run [scripts/verify_pg.py](../scripts/verify_pg.py) against disposable PostgreSQL to verify the migration, RLS policies, owner isolation, and JSON round trips.
