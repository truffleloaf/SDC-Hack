"""Optional server-side bridge to Supabase Auth (GoTrue).

The recommended flow is still the browser talking to Supabase directly with
``@supabase/supabase-js``; this module exists for the current UI-only frontend,
which already has a sign-in form but no Supabase client. It forwards the same
email/password to GoTrue and returns the session in camelCase.

Rules:

- the password is forwarded once over HTTPS and never stored or logged;
- the anon key is read from the server environment, never accepted from a
  request;
- GoTrue error messages are mapped to the API's ``{error}`` envelope.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.config import supabase_anon_key, supabase_url
from app.schemas import (
    AuthSessionResponse,
    AuthSessionUser,
    SignUpResponse,
)

GOTRUE_TIMEOUT_SECONDS = 10.0

SERVICE_UNAVAILABLE = "Supabase Auth is unavailable"
NOT_CONFIGURED = "Supabase Auth is not configured"


class AuthGatewayError(Exception):
    """A failure that maps directly to an HTTP response."""

    def __init__(self, status_code: int, message: str) -> None:
        self.status_code = status_code
        self.message = message
        super().__init__(message)


def _require_settings() -> tuple[str, str]:
    base = supabase_url()
    anon_key = supabase_anon_key()
    if not base or not anon_key:
        raise AuthGatewayError(503, NOT_CONFIGURED)
    return base, anon_key


def _request(
    method: str,
    path: str,
    *,
    json: dict[str, Any] | None = None,
    params: dict[str, str] | None = None,
    bearer: str | None = None,
) -> tuple[int, dict[str, Any]]:
    base, anon_key = _require_settings()
    headers = {"apikey": anon_key, "Content-Type": "application/json"}
    if bearer:
        headers["Authorization"] = f"Bearer {bearer}"

    try:
        response = httpx.request(
            method,
            f"{base}{path}",
            params=params,
            json=json,
            headers=headers,
            timeout=GOTRUE_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as exc:
        raise AuthGatewayError(503, SERVICE_UNAVAILABLE) from exc

    try:
        body = response.json()
    except ValueError:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return response.status_code, body


def _message(body: dict[str, Any], fallback: str) -> str:
    for key in ("error_description", "msg", "message", "error"):
        value = body.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()[:300]
    return fallback


def _error_code(body: dict[str, Any]) -> str:
    value = body.get("error")
    return value.strip().lower() if isinstance(value, str) else ""


def _session(body: dict[str, Any]) -> AuthSessionResponse:
    access_token = body.get("access_token")
    refresh_token = body.get("refresh_token")
    user = body.get("user")
    if not isinstance(access_token, str) or not access_token:
        raise AuthGatewayError(502, "Unexpected response from Supabase Auth")
    if not isinstance(refresh_token, str):
        refresh_token = ""
    if not isinstance(user, dict):
        user = {}
    role = user.get("role")
    return AuthSessionResponse(
        accessToken=access_token,
        refreshToken=refresh_token,
        tokenType=str(body.get("token_type") or "bearer"),
        expiresIn=int(body.get("expires_in") or 0),
        user=_user(user),
    )


def _user(raw: dict[str, Any]) -> AuthSessionUser:
    user_id = raw.get("id")
    if not isinstance(user_id, str) or not user_id:
        raise AuthGatewayError(502, "Unexpected response from Supabase Auth")
    email = raw.get("email")
    role = raw.get("role")
    app_metadata = raw.get("app_metadata")
    provider = None
    if isinstance(app_metadata, dict):
        candidate = app_metadata.get("provider")
        if isinstance(candidate, str):
            provider = candidate
    confirmed = bool(raw.get("email_confirmed_at") or raw.get("confirmed_at"))
    return AuthSessionUser(
        id=user_id,
        email=email if isinstance(email, str) else None,
        role=role if isinstance(role, str) else "authenticated",
        provider=provider,
        emailConfirmed=confirmed,
    )


def _invalid_credentials(body: dict[str, Any], fallback: str) -> AuthGatewayError:
    code = _error_code(body)
    message = _message(body, fallback)
    if code == "email_not_confirmed" or "not confirmed" in message.lower():
        return AuthGatewayError(403, "Email not confirmed")
    if code == "user_banned":
        return AuthGatewayError(403, "Account is unavailable")
    return AuthGatewayError(401, fallback)


def _raise_for_status(status: int, body: dict[str, Any], fallback: str) -> None:
    code = _error_code(body)
    message = _message(body, fallback)
    if status == 429:
        raise AuthGatewayError(429, "Too many attempts; try again later")
    if status >= 500:
        raise AuthGatewayError(503, SERVICE_UNAVAILABLE)
    if "already registered" in message.lower() or code == "user_already_exists":
        raise AuthGatewayError(409, "Email already registered")
    if status in (401, 403):
        raise AuthGatewayError(401, message)
    raise AuthGatewayError(400, message)


def sign_in(email: str, password: str) -> AuthSessionResponse:
    status, body = _request(
        "POST",
        "/auth/v1/token",
        params={"grant_type": "password"},
        json={"email": email, "password": password},
    )
    if status == 200:
        return _session(body)
    if status == 429 or status >= 500:
        _raise_for_status(status, body, "Sign in failed")
    raise _invalid_credentials(body, "Invalid email or password")


def sign_up(email: str, password: str) -> SignUpResponse:
    status, body = _request(
        "POST",
        "/auth/v1/signup",
        json={"email": email, "password": password},
    )
    if status not in (200, 201):
        _raise_for_status(status, body, "Sign up failed")

    if isinstance(body.get("access_token"), str):
        session = _session(body)
        return SignUpResponse(
            needsEmailConfirmation=False,
            user=session.user,
            session=session,
        )

    raw_user = body.get("user") if isinstance(body.get("user"), dict) else body
    return SignUpResponse(
        needsEmailConfirmation=True,
        user=_user(raw_user),
        session=None,
    )


def refresh(refresh_token: str) -> AuthSessionResponse:
    status, body = _request(
        "POST",
        "/auth/v1/token",
        params={"grant_type": "refresh_token"},
        json={"refresh_token": refresh_token},
    )
    if status == 200:
        return _session(body)
    if _error_code(body) in {"invalid_grant", "invalid_refresh_token"}:
        raise AuthGatewayError(401, "Invalid or expired refresh token")
    _raise_for_status(status, body, "Token refresh failed")
    raise AuthGatewayError(502, "Unexpected response from Supabase Auth")


def sign_out(access_token: str | None) -> bool:
    """Sign out of Supabase; missing/invalid tokens are already signed out."""
    if not access_token:
        return True
    try:
        status, _body = _request("POST", "/auth/v1/logout", bearer=access_token)
    except AuthGatewayError:
        return True
    return status in (200, 204, 401, 403)


def send_password_reset(email: str) -> bool:
    """Ask GoTrue to email a reset link; always reports success to the caller.

    This deliberately hides whether the address exists, but still surfaces
    rate-limit and upstream failures.
    """
    status, body = _request("POST", "/auth/v1/recover", json={"email": email})
    if status == 429 or status >= 500:
        _raise_for_status(status, body, "Password reset failed")
    return True
