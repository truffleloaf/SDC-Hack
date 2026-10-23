"""Supabase Auth: verify the access token a signed-in browser sends.

The frontend signs users in with Supabase (email/password, OAuth, magic link —
the backend does not care). Supabase issues a short-lived JWT; every protected
request carries it as ``Authorization: Bearer <access_token>``.

Verification uses the project's public JWKS (``ES256`` on new projects,
``RS256`` on some older ones). The private key never reaches this process and
nothing is shared with the browser except the public anon key. Legacy projects
that still sign with an HS256 secret can set ``SUPABASE_JWT_SECRET``.

Nothing here creates users or sessions; that is Supabase's job. The dependency
only answers "which user is this?".
"""

from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import (
    supabase_jwt_secret,
    supabase_jwks_ttl,
    supabase_url,
)

#: Clock skew tolerated when checking ``exp`` / ``nbf``.
LEEWAY_SECONDS = 10

#: Network timeout for fetching the public key set.
JWKS_TIMEOUT_SECONDS = 5.0

#: Asymmetric algorithms Supabase uses for access tokens.
ASYMMETRIC_ALGORITHMS = ("ES256", "RS256")

#: Supabase marks user tokens with this audience and role.
AUTHENTICATED_AUDIENCE = "authenticated"
AUTHENTICATED_ROLE = "authenticated"


class AuthError(Exception):
    """Base class for an auth failure that maps to an HTTP response."""

    status_code = status.HTTP_401_UNAUTHORIZED
    message = "Invalid or expired token"

    def __init__(self, message: str | None = None) -> None:
        self.message = message or type(self).message
        super().__init__(self.message)


class InvalidToken(AuthError):
    status_code = status.HTTP_401_UNAUTHORIZED
    message = "Invalid or expired token"


class AuthNotConfigured(AuthError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    message = "Supabase Auth is not configured"


class AuthUnavailable(AuthError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    message = "Supabase Auth keys are unavailable"


@dataclass(frozen=True)
class AuthUser:
    """The verified identity behind a request."""

    id: str
    email: str | None
    role: str
    provider: str | None
    expires_at: datetime | None
    claims: dict[str, Any]


_JWKS_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_JWKS_LOCK = threading.Lock()


def _cached_jwks(url: str) -> dict[str, Any] | None:
    with _JWKS_LOCK:
        cached = _JWKS_CACHE.get(url)
        if cached is None:
            return None
        fetched_at, document = cached
        if time.monotonic() - fetched_at > supabase_jwks_ttl():
            return None
        return document


def _fetch_jwks(url: str, *, force: bool = False) -> dict[str, Any]:
    """Fetch and cache ``/auth/v1/.well-known/jwks.json`` for one project.

    A missing ``kid`` (key rotation) forces one refresh. Network failures map
    to 503 so clients can retry instead of treating a valid session as forged.
    """
    if not force:
        cached = _cached_jwks(url)
        if cached is not None:
            return cached

    endpoint = f"{url}/auth/v1/.well-known/jwks.json"
    try:
        response = httpx.get(
            endpoint,
            timeout=JWKS_TIMEOUT_SECONDS,
            headers={"Accept": "application/json"},
        )
        response.raise_for_status()
        document = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise AuthUnavailable() from exc

    if not isinstance(document, dict) or not isinstance(document.get("keys"), list):
        raise AuthUnavailable()
    if not document["keys"]:
        raise AuthUnavailable()

    with _JWKS_LOCK:
        _JWKS_CACHE[url] = (time.monotonic(), document)
    return document


def clear_jwks_cache() -> None:
    """Drop cached keys (used by tests and after a key rotation)."""
    with _JWKS_LOCK:
        _JWKS_CACHE.clear()


def _find_key(document: dict[str, Any], kid: str | None) -> dict[str, Any] | None:
    keys = [key for key in document.get("keys", []) if isinstance(key, dict)]
    if kid:
        for key in keys:
            if key.get("kid") == kid:
                return key
        return None
    # A single-key project may omit the kid; more than one key is ambiguous.
    return keys[0] if len(keys) == 1 else None


def _verification_key(token: str) -> tuple[Any, list[str], bool]:
    """Return ``(key, algorithms, verify_issuer)`` for the token's header."""
    if not supabase_url():
        raise AuthNotConfigured()

    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise InvalidToken("Malformed token") from exc

    algorithm = header.get("alg")
    if algorithm == "HS256":
        secret = supabase_jwt_secret()
        if not secret:
            raise InvalidToken(
                "HS256 tokens require SUPABASE_JWT_SECRET on the server"
            )
        return secret, [algorithm], False

    if algorithm not in ASYMMETRIC_ALGORITHMS:
        raise InvalidToken("Unsupported token algorithm")

    url = supabase_url()
    kid = header.get("kid")
    jwk = _find_key(_fetch_jwks(url), kid)
    if jwk is None:
        # The project may have rotated keys since the cached document.
        jwk = _find_key(_fetch_jwks(url, force=True), kid)
    if jwk is None:
        raise InvalidToken("Unknown token signing key")

    try:
        return jwt.PyJWK(jwk).key, [algorithm], True
    except jwt.PyJWTError as exc:
        raise AuthUnavailable() from exc


def verify_access_token(token: str) -> AuthUser:
    """Verify a Supabase access token and return its user, or raise ``AuthError``."""
    url = supabase_url()
    if not url:
        raise AuthNotConfigured()

    key, algorithms, verify_issuer = _verification_key(token)

    options: dict[str, Any] = {"require": ["exp", "sub", "aud"]}
    kwargs: dict[str, Any] = {
        "algorithms": algorithms,
        "audience": AUTHENTICATED_AUDIENCE,
        "leeway": LEEWAY_SECONDS,
        "options": options,
    }
    if verify_issuer:
        kwargs["issuer"] = f"{url}/auth/v1"
        options["require"].append("iss")
    else:
        options["verify_iss"] = False

    try:
        claims = jwt.decode(token, key, **kwargs)
    except jwt.ExpiredSignatureError as exc:
        raise InvalidToken("Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidToken("Invalid token") from exc

    if claims.get("role") != AUTHENTICATED_ROLE:
        raise InvalidToken("A signed-in user is required")

    subject = claims.get("sub")
    try:
        user_id = str(uuid.UUID(str(subject)))
    except (TypeError, ValueError) as exc:
        raise InvalidToken("Token has no valid user id") from exc

    email = claims.get("email")
    if not isinstance(email, str):
        email = None

    metadata = claims.get("app_metadata")
    provider = None
    if isinstance(metadata, dict):
        raw_provider = metadata.get("provider")
        if isinstance(raw_provider, str):
            provider = raw_provider

    expires_at = None
    raw_exp = claims.get("exp")
    if isinstance(raw_exp, (int, float)):
        expires_at = datetime.fromtimestamp(raw_exp, tz=timezone.utc)

    return AuthUser(
        id=user_id,
        email=email,
        role=AUTHENTICATED_ROLE,
        provider=provider,
        expires_at=expires_at,
        claims=claims,
    )


_bearer = HTTPBearer(
    auto_error=False,
    description="Supabase access token (the access_token from the sign-in session)",
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser:
    """FastAPI dependency: require a valid Supabase user token."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return verify_access_token(credentials.credentials)
    except AuthError as exc:
        headers = (
            {"WWW-Authenticate": "Bearer"}
            if exc.status_code == status.HTTP_401_UNAUTHORIZED
            else None
        )
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
            headers=headers,
        ) from exc
