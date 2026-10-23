"""End-to-end smoke test for sign-in -> profile -> delete.

Requires the API to be running and ``SUPABASE_ANON_KEY`` to be configured in its
``.env``. The password is read with ``getpass`` unless ``--password`` is given;
it is only sent to the local API and is never printed.

Examples:
    # Sign in with an existing user, save a profile, read it, delete it
    .\\.venv\\Scripts\\python.exe scripts\\smoke_auth.py --email you@example.com

    # Create the user first (needs "Confirm email" disabled in Supabase)
    .\\.venv\\Scripts\\python.exe scripts\\smoke_auth.py --signup --email you@example.com
"""

from __future__ import annotations

import argparse
import getpass
import json
import sys
from typing import Any

import httpx

DEFAULT_API = "http://127.0.0.1:8000"

PROFILE = {
    "roleId": "finance-admin",
    "selections": [{"taskId": "fa-invoice", "share": 30}],
    "skills": {"excel": 3},
    "scenario": "normal",
    "hoursPerWeek": 6,
    "freeOnly": False,
    "name": "Auth smoke test",
    "completedSteps": [],
    "customTasks": [],
    "customSignals": [],
}


def call(
    client: httpx.Client,
    method: str,
    path: str,
    *,
    token: str | None = None,
    body: dict[str, Any] | None = None,
    expected: int = 200,
) -> Any:
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = client.request(method, path, headers=headers, json=body)
    try:
        payload = response.json()
    except ValueError:
        payload = None
    if response.status_code != expected:
        message = (
            payload.get("error")
            if isinstance(payload, dict) and payload.get("error")
            else response.text[:300]
        )
        raise SystemExit(f"{method} {path} -> {response.status_code}: {message}")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--api-base", default=DEFAULT_API)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", default=None)
    parser.add_argument("--signup", action="store_true", help="create the user first")
    parser.add_argument(
        "--keep-profile",
        action="store_true",
        help="do not delete the saved profile after reading it",
    )
    args = parser.parse_args()

    email = args.email.strip().lower()
    password = args.password or getpass.getpass("Supabase password: ")
    base = args.api_base.rstrip("/")

    with httpx.Client(base_url=base, timeout=20.0) as client:
        config = call(client, "GET", "/api/auth/config")
        print(f"config: url={config.get('url')} signInEnabled={config.get('signInEnabled')}")
        if not config.get("signInEnabled"):
            raise SystemExit(
                "signInEnabled is false: put SUPABASE_ANON_KEY in .env and restart the API."
            )

        if args.signup:
            signup = call(
                client,
                "POST",
                "/api/auth/signup",
                body={"email": email, "password": password},
                expected=201,
            )
            print(
                "signup: needsEmailConfirmation="
                f"{signup.get('needsEmailConfirmation')} user={signup.get('user', {}).get('id')}"
            )
            if signup.get("needsEmailConfirmation"):
                raise SystemExit(
                    "Email confirmation is enabled; confirm the email, then run this "
                    "script again without --signup."
                )

        session = call(
            client,
            "POST",
            "/api/auth/signin",
            body={"email": email, "password": password},
        )
        token = session["accessToken"]
        print(f"signin: user={session.get('user', {}).get('id')} expiresIn={session.get('expiresIn')}")

        me = call(client, "GET", "/api/auth/me", token=token)
        print(f"me: {me.get('email')} ({me.get('id')})")

        # Start from a clean slate so the smoke test is repeatable.
        call(client, "DELETE", "/api/me/profile", token=token)

        saved = call(client, "PUT", "/api/me/profile", token=token, body=PROFILE)
        print(f"profile PUT: user={saved.get('userId')} role={saved.get('roleId')}")

        fetched = call(client, "GET", "/api/me/profile", token=token)
        if fetched.get("userId") != saved.get("userId"):
            raise SystemExit("profile GET returned a different user")
        print(f"profile GET: name={fetched.get('name')} updatedAt={fetched.get('updatedAt')}")

        if not args.keep_profile:
            deleted = call(client, "DELETE", "/api/me/profile", token=token)
            print(f"profile DELETE: deleted={deleted.get('deleted')}")

        call(client, "POST", "/api/auth/signout", token=token)

    print("\nAuth smoke test passed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except httpx.HTTPError as exc:
        print(f"HTTP error: {type(exc).__name__}: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
