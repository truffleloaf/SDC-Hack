"""Database selection for local, serverless and live processes.

The hosted deployment runs the same code on a read-only checkout, so the demo
SQLite fallback must live somewhere writable. These tests pin that choice down
without starting a server.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest
from sqlalchemy.engine import make_url

from app import db

DATABASE_ENV = (
    "PIVOTT_DB",
    "TASK_SHIFT_DB",
    "DATABASE_URL",
    "VERCEL",
    "AWS_LAMBDA_FUNCTION_NAME",
)


@pytest.fixture(autouse=True)
def isolated_database_env(monkeypatch):
    for name in DATABASE_ENV:
        monkeypatch.delenv(name, raising=False)


def test_local_demo_uses_the_repository_sqlite_file():
    assert db.resolve_database_url() == "sqlite:///./pivott.db"


def test_serverless_demo_uses_a_writable_temp_file(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")

    url = db.resolve_database_url()

    assert url.startswith("sqlite:///")
    assert Path(make_url(url).database) == Path(tempfile.gettempdir(), "pivott.db")


def test_lambda_demo_uses_a_writable_temp_file(monkeypatch):
    monkeypatch.setenv("AWS_LAMBDA_FUNCTION_NAME", "pivott-api")

    url = db.resolve_database_url()

    assert Path(make_url(url).database) == Path(tempfile.gettempdir(), "pivott.db")


def test_explicit_database_wins_on_serverless(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+psycopg://user:pass@db.example.com:5432/postgres",
    )

    assert db.resolve_database_url() == (
        "postgresql+psycopg://user:pass@db.example.com:5432/postgres"
    )


def test_live_still_requires_an_explicit_database(monkeypatch):
    monkeypatch.setattr(db, "is_demo", lambda: False)

    with pytest.raises(RuntimeError, match="PIVOTT_DATASET=live"):
        db.resolve_database_url()
