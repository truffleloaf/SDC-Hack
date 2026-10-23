"""Supabase Auth token verification and auth endpoints."""

from __future__ import annotations

import json
import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec

from app import auth, config

BASE_URL = "https://test.supabase.co"
ISSUER = f"{BASE_URL}/auth/v1"
USER_ID = "11111111-1111-1111-1111-111111111111"


class SigningKey:
    """An ES256 key pair plus a matching JWKS document (as Supabase serves)."""

    def __init__(self) -> None:
        self.private_key = ec.generate_private_key(ec.SECP256R1())
        self.jwk = json.loads(
            jwt.algorithms.ECAlgorithm.to_jwk(self.private_key.public_key())
        )
        self.jwk.update({"kid": "test-key", "alg": "ES256", "use": "sig"})

    def token(self, *, headers: dict | None = None, **claim_overrides) -> str:
        now = int(time.time())
        claims = {
            "iss": ISSUER,
            "aud": "authenticated",
            "sub": USER_ID,
            "role": "authenticated",
            "email": "aisyah@example.com",
            "iat": now,
            "exp": now + 3600,
            "app_metadata": {"provider": "email"},
            "user_metadata": {"name": "Aisyah"},
            "session_id": str(uuid.uuid4()),
        }
        claims.update(claim_overrides)
        return jwt.encode(
            claims,
            self.private_key,
            algorithm="ES256",
            headers=headers or {"kid": "test-key"},
        )

    def jwks(self) -> dict:
        return {"keys": [self.jwk]}


@pytest.fixture()
def supabase(monkeypatch):
    key = SigningKey()
    monkeypatch.setattr(auth, "supabase_url", lambda: BASE_URL)
    monkeypatch.setattr(auth, "_fetch_jwks", lambda url, force=False: key.jwks())
    return key


def test_verifies_es256_access_token(supabase):
    user = auth.verify_access_token(supabase.token())

    assert user.id == USER_ID
    assert user.email == "aisyah@example.com"
    assert user.role == "authenticated"
    assert user.provider == "email"
    assert user.expires_at is not None
    assert user.claims["aud"] == "authenticated"


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"exp": int(time.time()) - 60}, "expired"),
        ({"aud": "anon"}, "Invalid token"),
        ({"iss": "https://evil.example/auth/v1"}, "Invalid token"),
        ({"role": "anon"}, "signed-in"),
        ({"sub": "not-a-uuid"}, "user id"),
    ],
)
def test_rejects_bad_claims(supabase, overrides, message):
    with pytest.raises(auth.InvalidToken, match=message):
        auth.verify_access_token(supabase.token(**overrides))


def test_rejects_tampered_token(supabase):
    token = supabase.token()
    with pytest.raises(auth.InvalidToken):
        auth.verify_access_token(token[:-2] + ("aa" if token[-2:] != "aa" else "bb"))


def test_rejects_unknown_signing_key(supabase):
    token = supabase.token(headers={"kid": "rotated-away"})
    with pytest.raises(auth.InvalidToken, match="signing key"):
        auth.verify_access_token(token)


def test_rejects_malformed_token(supabase):
    with pytest.raises(auth.InvalidToken, match="Malformed"):
        auth.verify_access_token("not-a-jwt")


def test_hs256_supported_with_legacy_secret(supabase, monkeypatch):
    secret = "legacy-secret-0123456789abcdef0123456789abcdef"
    monkeypatch.setattr(auth, "supabase_jwt_secret", lambda: secret)
    claims = {
        "iss": "supabase",
        "aud": "authenticated",
        "sub": USER_ID,
        "role": "authenticated",
        "email": "legacy@example.com",
        "exp": int(time.time()) + 600,
    }
    token = jwt.encode(claims, secret, algorithm="HS256")

    user = auth.verify_access_token(token)
    assert user.id == USER_ID
    assert user.email == "legacy@example.com"


def test_hs256_without_secret_is_rejected(supabase):
    token = jwt.encode(
        {"sub": USER_ID, "aud": "authenticated", "exp": int(time.time()) + 600},
        "some-secret-0123456789abcdef0123456789abcdef",
        algorithm="HS256",
    )
    with pytest.raises(auth.InvalidToken, match="SUPABASE_JWT_SECRET"):
        auth.verify_access_token(token)


# ---------------------------------------------------------------------------
# HTTP surface
# ---------------------------------------------------------------------------


def test_publishable_key_env_is_accepted(monkeypatch):
    monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    assert config.supabase_anon_key() == "sb_publishable_test"

    monkeypatch.setenv("SUPABASE_ANON_KEY", "legacy-anon")
    assert config.supabase_anon_key() == "legacy-anon"


def test_auth_config_is_public(client, monkeypatch):
    from app.routers import auth as auth_router

    monkeypatch.setattr(auth_router, "supabase_url", lambda: BASE_URL)
    monkeypatch.setattr(auth_router, "supabase_anon_key", lambda: "anon-key")

    body = client.get("/api/auth/config").json()
    assert body == {
        "url": BASE_URL,
        "anonKey": "anon-key",
        "authEnabled": True,
        "signInEnabled": True,
    }


def test_auth_config_can_be_disabled(client, monkeypatch):
    from app.routers import auth as auth_router

    monkeypatch.setattr(auth_router, "supabase_url", lambda: "")
    monkeypatch.setattr(auth_router, "supabase_anon_key", lambda: "")

    body = client.get("/api/auth/config").json()
    assert body["authEnabled"] is False
    assert body["signInEnabled"] is False
    assert body["anonKey"] is None


def test_me_requires_bearer_token(client, monkeypatch):
    monkeypatch.setattr(auth, "supabase_url", lambda: BASE_URL)

    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json() == {"error": "Missing bearer token"}
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_returns_verified_user(client, supabase):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {supabase.token()}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == USER_ID
    assert body["email"] == "aisyah@example.com"
    assert body["provider"] == "email"
    assert body["role"] == "authenticated"


def test_me_rejects_invalid_token(client, supabase):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer definitely-not-a-token"},
    )
    assert response.status_code == 401
    assert response.json() == {"error": "Malformed token"}


def test_me_is_503_when_auth_is_not_configured(client, monkeypatch):
    monkeypatch.setattr(auth, "supabase_url", lambda: "")

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer whatever"},
    )
    assert response.status_code == 503
    assert response.json() == {"error": "Supabase Auth is not configured"}
