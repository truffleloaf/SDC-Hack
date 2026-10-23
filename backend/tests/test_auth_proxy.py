"""The optional GoTrue bridge for a UI-only frontend (/api/auth/sign*)."""

from __future__ import annotations

import httpx
import pytest

from app.services import auth_gateway

SESSION_BODY = {
    "access_token": "access-token",
    "refresh_token": "refresh-token",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "aisyah@example.com",
        "role": "authenticated",
        "app_metadata": {"provider": "email"},
        "email_confirmed_at": "2026-10-23T03:00:00Z",
    },
}


def fake_request_factory(*responses):
    """Return a fake ``_request`` and the list of calls it received."""
    calls: list[tuple] = []

    def fake(method, path, **kwargs):
        calls.append((method, path, kwargs))
        if len(responses) == 1:
            return responses[0]
        return responses.pop(0)

    return fake, calls


def test_signin_returns_camel_case_session(client, monkeypatch):
    fake, calls = fake_request_factory((200, SESSION_BODY))
    monkeypatch.setattr(auth_gateway, "_request", fake)

    response = client.post(
        "/api/auth/signin",
        json={"email": " Aisyah@Example.com ", "password": "secret-123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["accessToken"] == "access-token"
    assert body["refreshToken"] == "refresh-token"
    assert body["tokenType"] == "bearer"
    assert body["expiresIn"] == 3600
    assert body["user"] == {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "aisyah@example.com",
        "role": "authenticated",
        "provider": "email",
        "emailConfirmed": True,
    }
    assert "password" not in response.text

    method, path, kwargs = calls[0]
    assert (method, path) == ("POST", "/auth/v1/token")
    assert kwargs["params"] == {"grant_type": "password"}
    assert kwargs["json"] == {
        "email": "aisyah@example.com",
        "password": "secret-123",
    }


def test_signin_rejects_bad_credentials(client, monkeypatch):
    fake, _ = fake_request_factory(
        (400, {"error": "invalid_grant", "error_description": "Invalid login credentials"})
    )
    monkeypatch.setattr(auth_gateway, "_request", fake)

    response = client.post(
        "/api/auth/signin",
        json={"email": "aisyah@example.com", "password": "wrong"},
    )
    assert response.status_code == 401
    assert response.json() == {"error": "Invalid email or password"}


def test_signin_requires_confirmed_email(client, monkeypatch):
    fake, _ = fake_request_factory(
        (400, {"error": "email_not_confirmed", "error_description": "Email not confirmed"})
    )
    monkeypatch.setattr(auth_gateway, "_request", fake)

    response = client.post(
        "/api/auth/signin",
        json={"email": "aisyah@example.com", "password": "secret-123"},
    )
    assert response.status_code == 403
    assert response.json() == {"error": "Email not confirmed"}


def test_signin_rate_limit(client, monkeypatch):
    fake, _ = fake_request_factory((429, {"error": "over_email_send_rate_limit"}))
    monkeypatch.setattr(auth_gateway, "_request", fake)

    response = client.post(
        "/api/auth/signin",
        json={"email": "aisyah@example.com", "password": "secret-123"},
    )
    assert response.status_code == 429
    assert "Too many" in response.json()["error"]


def test_signup_with_email_confirmation(client, monkeypatch):
    fake, _ = fake_request_factory(
        (200, {"id": "11111111-1111-1111-1111-111111111111", "email": "new@example.com"})
    )
    monkeypatch.setattr(auth_gateway, "_request", fake)

    response = client.post(
        "/api/auth/signup",
        json={"email": "new@example.com", "password": "secret-123"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["needsEmailConfirmation"] is True
    assert body["session"] is None
    assert body["user"]["email"] == "new@example.com"


def test_signup_with_autoconfirm_returns_session(client, monkeypatch):
    fake, _ = fake_request_factory((200, SESSION_BODY))
    monkeypatch.setattr(auth_gateway, "_request", fake)

    body = client.post(
        "/api/auth/signup",
        json={"email": "aisyah@example.com", "password": "secret-123"},
    ).json()
    assert body["needsEmailConfirmation"] is False
    assert body["session"]["accessToken"] == "access-token"


def test_signup_duplicate_email_is_409(client, monkeypatch):
    fake, _ = fake_request_factory(
        (422, {"error": "user_already_exists", "msg": "User already registered"})
    )
    monkeypatch.setattr(auth_gateway, "_request", fake)

    response = client.post(
        "/api/auth/signup",
        json={"email": "aisyah@example.com", "password": "secret-123"},
    )
    assert response.status_code == 409
    assert response.json() == {"error": "Email already registered"}


def test_signup_rejects_short_password(client):
    response = client.post(
        "/api/auth/signup",
        json={"email": "aisyah@example.com", "password": "123"},
    )
    assert response.status_code == 400
    assert "password" in response.json()["error"]


def test_refresh_rejects_invalid_token(client, monkeypatch):
    fake, _ = fake_request_factory((400, {"error": "invalid_grant"}))
    monkeypatch.setattr(auth_gateway, "_request", fake)

    response = client.post(
        "/api/auth/refresh",
        json={"refreshToken": "expired-refresh-token"},
    )
    assert response.status_code == 401
    assert response.json() == {"error": "Invalid or expired refresh token"}


def test_signout_is_idempotent_without_token(client):
    response = client.post("/api/auth/signout")
    assert response.status_code == 200
    assert response.json() == {"signedOut": True}


def test_signout_forwards_bearer_token(client, monkeypatch):
    fake, calls = fake_request_factory((204, {}))
    monkeypatch.setattr(auth_gateway, "_request", fake)

    body = client.post(
        "/api/auth/signout",
        headers={"Authorization": "Bearer access-token"},
    ).json()
    assert body == {"signedOut": True}
    assert calls[0][2]["bearer"] == "access-token"


def test_password_reset_never_reveals_existence(client, monkeypatch):
    fake, _ = fake_request_factory((200, {}))
    monkeypatch.setattr(auth_gateway, "_request", fake)

    response = client.post(
        "/api/auth/password/reset",
        json={"email": "nobody@example.com"},
    )
    assert response.status_code == 200
    assert response.json() == {"sent": True}


def test_password_reset_rejects_bad_email(client):
    response = client.post(
        "/api/auth/password/reset",
        json={"email": "not-an-email"},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid email address"}


def test_bridge_is_503_without_anon_key(client):
    response = client.post(
        "/api/auth/signin",
        json={"email": "aisyah@example.com", "password": "secret-123"},
    )
    assert response.status_code == 503
    assert response.json() == {"error": "Supabase Auth is not configured"}


def test_request_sends_anon_key_and_project_url(monkeypatch):
    captured: dict = {}

    def fake_request(method, url, **kwargs):
        captured.update({"method": method, "url": url, **kwargs})
        return httpx.Response(200, json={"ok": True}, request=httpx.Request(method, url))

    monkeypatch.setattr(auth_gateway, "supabase_url", lambda: "https://demo.supabase.co")
    monkeypatch.setattr(auth_gateway, "supabase_anon_key", lambda: "anon-key")
    monkeypatch.setattr(auth_gateway.httpx, "request", fake_request)

    status, body = auth_gateway._request(
        "POST",
        "/auth/v1/token",
        params={"grant_type": "password"},
        json={"email": "a@example.com", "password": "secret"},
    )
    assert status == 200
    assert body == {"ok": True}
    assert captured["url"] == "https://demo.supabase.co/auth/v1/token"
    assert captured["headers"]["apikey"] == "anon-key"
    assert captured["timeout"] == auth_gateway.GOTRUE_TIMEOUT_SECONDS


def test_request_maps_network_errors_to_503(monkeypatch):
    def boom(method, url, **kwargs):
        raise httpx.ConnectError("boom", request=httpx.Request(method, url))

    monkeypatch.setattr(auth_gateway, "supabase_url", lambda: "https://demo.supabase.co")
    monkeypatch.setattr(auth_gateway, "supabase_anon_key", lambda: "anon-key")
    monkeypatch.setattr(auth_gateway.httpx, "request", boom)

    with pytest.raises(auth_gateway.AuthGatewayError) as error:
        auth_gateway._request("POST", "/auth/v1/token", json={})
    assert error.value.status_code == 503
    assert error.value.message == "Supabase Auth is unavailable"
