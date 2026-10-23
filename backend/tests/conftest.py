"""Test fixtures.

Set the database URL before importing the app so the whole test run uses a
single in-memory SQLite database.
"""

from __future__ import annotations

import os

os.environ["PIVOTT_DB"] = "sqlite://"
os.environ["PIVOTT_DATASET"] = "demo"
# A developer .env may disable the demo reset for a public deployment; tests
# still exercise the local reset path, and the gate has its own test below.
os.environ["ALLOW_DEMO_RESET"] = "true"
# Keep the developer's real Supabase project out of the tests; individual auth
# tests monkeypatch the URL/JWKS explicitly.
os.environ["SUPABASE_URL"] = ""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.db import engine, reset_database
from app.main import app
from app.seed import seed_database


@pytest.fixture()
def client():
    reset_database()
    with Session(engine) as session:
        seed_database(session)
    with TestClient(app) as test_client:
        yield test_client
