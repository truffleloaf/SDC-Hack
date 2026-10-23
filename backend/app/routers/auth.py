"""Auth-facing endpoints.

Two supported flows:

1. **Recommended** — the browser signs users in with Supabase directly
   (``@supabase/supabase-js``) and only sends the access token here for
   verification (``GET /api/auth/me``).
2. **Bridge for a UI-only frontend** — the sign-in form calls the endpoints
   below; FastAPI forwards email/password to GoTrue once and returns the
   session. The password is never stored or logged.

Neither flow creates a user row here: Supabase Auth owns identities.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.auth import AuthUser, get_current_user
from app.config import supabase_anon_key, supabase_url
from app.schemas import (
    AuthConfigResponse,
    AuthSessionResponse,
    AuthUserResponse,
    PasswordResetRequest,
    PasswordResetResponse,
    RefreshTokenRequest,
    SignInRequest,
    SignOutResponse,
    SignUpRequest,
    SignUpResponse,
)
from app.services import auth_gateway

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _gateway_call(function, *args):
    """Run a gateway function, translating its errors to ``{error}`` responses."""
    try:
        return function(*args)
    except auth_gateway.AuthGatewayError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


def _email(value: str) -> str:
    email = value.strip().lower()
    local, sep, domain = email.partition("@")
    if not sep or not local or not domain or "." not in domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address",
        )
    return email


@router.get("/config", response_model=AuthConfigResponse)
def auth_config() -> AuthConfigResponse:
    """Public Supabase settings for the sign-in UI.

    ``anonKey`` is the publishable key and is safe in a browser; the service
    role key is never returned. ``signInEnabled`` is false until the deployment
    sets ``SUPABASE_ANON_KEY``.
    """
    url = supabase_url()
    anon_key = supabase_anon_key()
    return AuthConfigResponse(
        url=url,
        anonKey=anon_key or None,
        authEnabled=bool(url),
        signInEnabled=bool(url and anon_key),
    )


@router.post("/signin", response_model=AuthSessionResponse)
def sign_in(payload: SignInRequest) -> AuthSessionResponse:
    """Bridge for UI-only frontends: email/password -> Supabase session."""
    return _gateway_call(auth_gateway.sign_in, _email(payload.email), payload.password)


@router.post(
    "/signup",
    response_model=SignUpResponse,
    status_code=status.HTTP_201_CREATED,
)
def sign_up(payload: SignUpRequest) -> SignUpResponse:
    """Create a Supabase user; returns a session unless email confirmation is on."""
    return _gateway_call(
        auth_gateway.sign_up, _email(payload.email), payload.password
    )


@router.post("/refresh", response_model=AuthSessionResponse)
def refresh(payload: RefreshTokenRequest) -> AuthSessionResponse:
    """Exchange a refresh token for a new access token."""
    return _gateway_call(auth_gateway.refresh, payload.refreshToken)


@router.post("/signout", response_model=SignOutResponse)
def sign_out(authorization: str | None = Header(default=None)) -> SignOutResponse:
    """Revoke the Supabase session; idempotent when the token is missing/gone."""
    token = None
    if authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer" and value.strip():
            token = value.strip()
    return SignOutResponse(signedOut=_gateway_call(auth_gateway.sign_out, token))


@router.post("/password/reset", response_model=PasswordResetResponse)
def password_reset(payload: PasswordResetRequest) -> PasswordResetResponse:
    """Ask Supabase to email a password-reset link (never reveals if email exists)."""
    sent = _gateway_call(auth_gateway.send_password_reset, _email(payload.email))
    return PasswordResetResponse(sent=bool(sent))


@router.get("/me", response_model=AuthUserResponse)
def auth_me(user: AuthUser = Depends(get_current_user)) -> AuthUserResponse:
    """Return the signed-in user decoded from the Supabase access token."""
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        provider=user.provider,
        expiresAt=user.expires_at,
    )
