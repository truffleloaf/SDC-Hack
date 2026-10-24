"""Check whether Supabase Auth is ready for sign-in.

Usage:
    .\\.venv\\Scripts\\python.exe scripts\\check_auth.py

Checks, in order:

1. the Supabase project URL (``SUPABASE_URL`` or inferred from ``DATABASE_URL``);
2. the publishable/anon key (needed by the browser or the backend sign-in bridge);
3. the public JWKS the backend uses to verify access tokens.

Exit code 0 means the API can verify tokens; it also needs the anon key for a
browser or bridge sign-in. A missing anon key is reported as a warning by
default; pass ``--require-signin`` to make it a failure.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from app.config import (  # noqa: E402 - after load_dotenv/ROOT setup
    supabase_anon_key,
    supabase_jwt_secret,
    supabase_url,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--require-signin",
        action="store_true",
        help="exit non-zero when the anon key is missing (sign-in disabled)",
    )
    args = parser.parse_args()

    url = supabase_url()
    anon_key = supabase_anon_key()
    jwt_secret = supabase_jwt_secret()

    print(f"supabase url:        {url or '(not configured)'}")
    print(
        "publishable/anon key:"
        f" {'set (' + str(len(anon_key)) + ' chars)' if anon_key else 'MISSING'}"
    )
    print(f"legacy HS256 secret: {'set' if jwt_secret else 'not set (ES256/JWKS is fine)'}")

    if not url:
        print(
            "\nNo Supabase URL. Set SUPABASE_URL in .env, or set DATABASE_URL "
            "to a project connection string so the ref can be inferred."
        )
        return 1

    jwks_url = f"{url}/auth/v1/.well-known/jwks.json"
    try:
        response = httpx.get(jwks_url, timeout=10.0, headers={"Accept": "application/json"})
        response.raise_for_status()
        document = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        print(f"\nJWKS failed: {type(exc).__name__}: {exc}")
        return 1

    keys = document.get("keys") if isinstance(document, dict) else None
    if not isinstance(keys, list) or not keys:
        print("\nJWKS returned no keys; check the project URL.")
        return 1

    print(f"jwks:                {len(keys)} key(s) at {jwks_url}")
    for key in keys:
        if isinstance(key, dict):
            print(f"  alg={key.get('alg', '?')}  kid={key.get('kid', '?')}")

    print(f"\nauthEnabled (verify tokens): {bool(url)}")
    print(f"signInEnabled (browser/bridge): {bool(url and anon_key)}")

    if not anon_key:
        print(
            "\nSign-in is not ready: open\n"
            "  https://supabase.com/dashboard/project/<ref>/settings/api-keys\n"
            "and copy the Publishable key (sb_publishable_...) or the legacy\n"
            "anon key (eyJ...). Put it in .env as SUPABASE_ANON_KEY or\n"
            "SUPABASE_PUBLISHABLE_KEY, then restart the API."
        )
        return 1 if args.require_signin else 0

    print("\nSupabase Auth is ready for sign-in.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
