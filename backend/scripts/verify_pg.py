#!/usr/bin/env python
"""Verify the PostgreSQL path end to end, without touching Supabase.

Why this exists
---------------
SQLite is the local default and the CI test database, but Supabase runs
PostgreSQL. RLS, ``TRUNCATE ... RESTART IDENTITY CASCADE``, ``numeric``/``date``
types and the psycopg driver never execute against SQLite, so a schema change or
a reset bug can pass every local test and still break the demo. This script runs
the real thing on a throwaway database:

    schema.sql -> seed -> row/RLS/constraint checks -> reset (TRUNCATE) ->
    re-seed -> schema idempotency -> migrations -> FastAPI smoke test

Usage
-----
    python scripts/verify_pg.py
        Start an embedded PostgreSQL (``pgserver``), verify, then delete it.

    python scripts/verify_pg.py --url postgresql://postgres:pw@localhost:5433/postgres
        Use any disposable PostgreSQL (Docker, CI service, local install).

    python scripts/verify_pg.py --keep
        Leave the server/database running and print the connection string.

The script creates and drops a dedicated database named ``pivott_verify``. It
refuses to run against the real Supabase project unless ``--allow-supabase`` is
passed explicitly, because that would be testing in the demo's production
database.

Exit code is 0 only when every check passes.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
import time
import traceback
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import psycopg

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

SCHEMA_FILE = ROOT / "supabase" / "schema.sql"
MIGRATIONS_DIR = ROOT / "supabase" / "migrations"

DEFAULT_DATABASE = "pivott_verify"

EXPECTED_ROWS = {
    "skills": 15,
    "roles": 6,
    "sdgs": 4,
    "scenarios": 2,
    "tasks": 31,
    "role_requirements": 36,
    "role_sdgs": 10,
    "task_skills": 73,
    "signals": 20,
    "signal_task_impacts": 41,
    "resources": 24,
    "job_postings": 0,
    "meta": 4,
}
EXPECTED_TABLES = set(EXPECTED_ROWS)
EXPECTED_TOTAL_ROWS = sum(EXPECTED_ROWS.values())
EXPECTED_POLICIES = 12
EXPECTED_PROFILE_POLICIES = 4
EXPECTED_INDEXES_BASELINE = {
    "tasks_role_id_idx",
    "signals_date_idx",
    "signals_evidence_idx",
    "resources_skill_id_idx",
    "job_postings_role_id_idx",
    "job_postings_posted_at_idx",
}
EXPECTED_INDEXES_FINAL = EXPECTED_INDEXES_BASELINE | {
    "skills_name_key",
    "profiles_updated_at_idx",
}
PROFILE_TEST_USER = "11111111-1111-1111-1111-111111111111"
PROFILE_OTHER_USER = "22222222-2222-2222-2222-222222222222"

# Same fixtures the API tests use: Aisyah / Finance Admin, 6h/week.
AISYAH = {
    "roleId": "finance-admin",
    "selections": [
        {"taskId": "fa-invoice", "share": 30},
        {"taskId": "fa-recon", "share": 20},
        {"taskId": "fa-exception", "share": 15},
        {"taskId": "fa-reporting", "share": 15},
        {"taskId": "fa-comms", "share": 10},
        {"taskId": "fa-expense", "share": 10},
    ],
    "skills": {
        "excel": 3,
        "erp": 3,
        "controls": 3,
        "stakeholder": 2,
        "analysis": 2,
        "writing": 2,
        "empathy": 2,
        "coordination": 2,
        "process": 1,
        "automation": 1,
        "bi": 1,
        "ai": 1,
        "stats": 1,
        "sql": 0,
        "python": 0,
    },
    "scenario": "normal",
    "hoursPerWeek": 6,
    "freeOnly": False,
}

NEW_SIGNAL = {
    "date": "2026-09-30",
    "headline": "A new invoice agent reaches finance teams",
    "sourceName": "Demo source",
    "sourceUrl": "https://example.org/signal",
    "direction": 1,
    "strength": 0.6,
    "impacts": [{"taskId": "fa-invoice", "impact": 0.15}],
    "explanation": "Synthetic demo signal.",
}


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------


class Report:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.failures: list[tuple[str, str]] = []

    def pass_(self, name: str, detail: str = "") -> None:
        self.passed += 1
        suffix = f"  ({detail})" if detail else ""
        print(f"[PASS] {name}{suffix}")

    def skip(self, name: str, reason: str) -> None:
        self.skipped += 1
        print(f"[SKIP] {name}  ({reason})")

    def fail(self, name: str, exc: BaseException) -> None:
        self.failed += 1
        message = f"{type(exc).__name__}: {exc}"
        self.failures.append((name, message))
        print(f"[FAIL] {name}\n       {message}")


def check(report: Report, name: str, fn) -> bool:
    """Run one check, record the outcome, keep going after failures."""
    started = time.perf_counter()
    try:
        detail = fn() or ""
    except Exception as exc:  # noqa: BLE001 - report, don't abort the suite
        report.fail(name, exc)
        return False
    elapsed = time.perf_counter() - started
    report.pass_(name, f"{detail}{', ' if detail else ''}{elapsed * 1000:.0f} ms")
    return True


# ---------------------------------------------------------------------------
# SQL helpers
# ---------------------------------------------------------------------------

_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def quote_identifier(name: str) -> str:
    if not _IDENTIFIER_RE.match(name):
        raise ValueError(f"refusing suspicious identifier: {name!r}")
    return f'"{name}"'


def split_sql(script: str) -> list[str]:
    """Split a psql script on top-level semicolons.

    Handles line/block comments, single-quoted strings, double-quoted
    identifiers and dollar-quoted bodies (``$$ ... $$`` /
    ``$tag$ ... $tag$``), which naive ``split(";")`` breaks on.
    """
    statements: list[str] = []
    buf: list[str] = []
    i, n = 0, len(script)

    while i < n:
        ch = script[i]
        nxt = script[i + 1] if i + 1 < n else ""

        if ch == "-" and nxt == "-":
            newline = script.find("\n", i)
            i = n if newline == -1 else newline + 1
            buf.append(" ")
            continue

        if ch == "/" and nxt == "*":
            depth = 1
            i += 2
            while i < n and depth:
                if script[i] == "/" and i + 1 < n and script[i + 1] == "*":
                    depth += 1
                    i += 2
                elif script[i] == "*" and i + 1 < n and script[i + 1] == "/":
                    depth -= 1
                    i += 2
                else:
                    i += 1
            buf.append(" ")
            continue

        if ch == "'":
            buf.append(ch)
            i += 1
            while i < n:
                buf.append(script[i])
                if script[i] == "'":
                    if i + 1 < n and script[i + 1] == "'":
                        buf.append(script[i + 1])
                        i += 2
                        continue
                    i += 1
                    break
                i += 1
            continue

        if ch == '"':
            buf.append(ch)
            i += 1
            while i < n:
                buf.append(script[i])
                if script[i] == '"':
                    if i + 1 < n and script[i + 1] == '"':
                        buf.append(script[i + 1])
                        i += 2
                        continue
                    i += 1
                    break
                i += 1
            continue

        if ch == "$":
            match = re.match(r"\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$", script[i:])
            if match:
                tag = match.group(0)
                buf.append(tag)
                i += len(tag)
                end = script.find(tag, i)
                if end == -1:
                    raise ValueError("unterminated dollar-quoted string")
                buf.append(script[i:end])
                buf.append(tag)
                i = end + len(tag)
                continue

        if ch == ";":
            statement = "".join(buf).strip()
            if statement:
                statements.append(statement)
            buf = []
            i += 1
            continue

        buf.append(ch)
        i += 1

    tail = "".join(buf).strip()
    if tail:
        statements.append(tail)
    return statements


def apply_sql_file(conn: psycopg.Connection, path: Path) -> int:
    # utf-8-sig: Windows editors (Notepad, PowerShell 5.1 Set-Content) prepend a
    # BOM, which PostgreSQL rejects as a syntax error on the first statement.
    statements = split_sql(path.read_text(encoding="utf-8-sig"))
    for index, statement in enumerate(statements, start=1):
        try:
            conn.execute(statement)
        except Exception as exc:
            raise RuntimeError(
                f"{path.name}: statement #{index}/{len(statements)} failed: {exc}\n"
                f"--- SQL ---\n{statement[:800]}"
            ) from exc
    return len(statements)


def count_rows(conn: psycopg.Connection, table: str) -> int:
    return conn.execute(
        f"select count(*) from public.{quote_identifier(table)}"
    ).fetchone()[0]


def all_counts(conn: psycopg.Connection) -> dict[str, int]:
    return {table: count_rows(conn, table) for table in sorted(EXPECTED_TABLES)}


# ---------------------------------------------------------------------------
# URL handling
# ---------------------------------------------------------------------------


def normalize_url(url: str) -> str:
    """Return a psycopg-compatible ``postgresql://`` URL."""
    if url.startswith("postgresql+psycopg://"):
        return "postgresql://" + url[len("postgresql+psycopg://") :]
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        return url
    raise ValueError(f"expected a postgres URL, got: {url.split('://')[0]}://...")


def sqlalchemy_url(url: str) -> str:
    return "postgresql+psycopg://" + normalize_url(url)[len("postgresql://") :]


def with_database(url: str, database: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, f"/{database}", parts.query, ""))


def redact(url: str) -> str:
    parts = urlsplit(url)
    if parts.password:
        netloc = parts.netloc.replace(f":{parts.password}@", ":***@", 1)
        return urlunsplit((parts.scheme, netloc, parts.path, parts.query, ""))
    return url


def assert_disposable(url: str, database: str, allow_supabase: bool) -> None:
    host = (urlsplit(url).hostname or "").lower()
    if database in {"postgres", "pivott", "template0", "template1"}:
        raise SystemExit(f"refusing to use database name {database!r}; pass a dedicated name")
    is_supabase = host.endswith(".supabase.co") or host.endswith(".supabase.com")
    if is_supabase and not allow_supabase:
        raise SystemExit(
            "refusing to run against Supabase: this creates and drops a database.\n"
            "Use a local/Docker/CI PostgreSQL, or pass --allow-supabase if this is "
            "really a disposable staging project."
        )


# ---------------------------------------------------------------------------
# Embedded PostgreSQL
# ---------------------------------------------------------------------------


def start_embedded(keep: bool = False) -> tuple[object, str, Path]:
    try:
        import fasteners
        import pgserver
        from pgserver import postgres_server
    except ImportError:
        raise SystemExit(
            "embedded mode needs pgserver:\n"
            "  .venv/Scripts/python.exe -m pip install -r requirements-dev.txt\n"
            "or point the script at a running PostgreSQL with --url."
        )

    runtime = ROOT / ".tmp" / "pgverify-runtime"
    runtime.mkdir(parents=True, exist_ok=True)
    # The package defaults to %TEMP% for its lock file, which some Windows
    # sandboxes/AV setups refuse; keep everything inside the workspace instead.
    postgres_server.PostgresServer.runtime_path = runtime
    postgres_server.PostgresServer.lock_path = runtime / ".lockfile"
    postgres_server.PostgresServer._lock = fasteners.InterProcessLock(
        str(runtime / ".lockfile")
    )

    pgdata = Path(tempfile.mkdtemp(prefix="pgdata-", dir=str(ROOT / ".tmp")))
    print(f"starting embedded PostgreSQL in {pgdata} ...")
    server = pgserver.get_server(str(pgdata), cleanup_mode=None if keep else "delete")
    return server, normalize_url(server.get_uri()), pgdata


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------


def check_tables(conn: psycopg.Connection) -> str:
    rows = [
        row[0]
        for row in conn.execute(
            "select table_name from information_schema.tables "
            "where table_schema = 'public' and table_type = 'BASE TABLE' "
            "order by table_name"
        )
    ]
    if set(rows) != EXPECTED_TABLES:
        raise AssertionError(
            f"unexpected tables; missing={sorted(EXPECTED_TABLES - set(rows))}, "
            f"extra={sorted(set(rows) - EXPECTED_TABLES)}"
        )
    return f"{len(rows)} tables"


def check_row_counts(conn: psycopg.Connection) -> str:
    actual = all_counts(conn)
    wrong = {
        table: f"{actual[table]} != {expected}"
        for table, expected in EXPECTED_ROWS.items()
        if actual[table] != expected
    }
    if wrong:
        raise AssertionError(f"row count mismatch: {wrong}")
    return f"{EXPECTED_TOTAL_ROWS} rows"


def check_empty(conn: psycopg.Connection) -> str:
    leftover = {table: rows for table, rows in all_counts(conn).items() if rows}
    if leftover:
        raise AssertionError(f"expected an empty database, found rows: {leftover}")
    return f"all {len(EXPECTED_TABLES)} tables empty"


def check_rls(conn: psycopg.Connection) -> str:
    missing = [
        row[0]
        for row in conn.execute(
            "select c.relname from pg_class c "
            "join pg_namespace n on n.oid = c.relnamespace "
            "where n.nspname = 'public' and c.relkind = 'r' "
            "and not c.relrowsecurity order by c.relname"
        )
    ]
    if missing:
        raise AssertionError(f"RLS not enabled on: {missing}")

    policies = conn.execute(
        "select count(*) from pg_policies where schemaname = 'public'"
    ).fetchone()[0]
    if policies != EXPECTED_POLICIES:
        raise AssertionError(f"expected {EXPECTED_POLICIES} policies, found {policies}")

    writes = conn.execute(
        "select count(*) from pg_policies "
        "where schemaname = 'public' and cmd <> 'SELECT'"
    ).fetchone()[0]
    if writes:
        raise AssertionError(f"found {writes} non-SELECT policy/policies; catalog is read-only")
    return f"{len(EXPECTED_TABLES)} tables with RLS, {EXPECTED_POLICIES} SELECT-only policies"


def check_indexes(conn: psycopg.Connection, expected: set[str]) -> str:
    names = {
        row[0]
        for row in conn.execute(
            "select c.relname "
            "from pg_index i "
            "join pg_class c on c.oid = i.indexrelid "
            "join pg_namespace n on n.oid = c.relnamespace "
            "where n.nspname = 'public' and not i.indisprimary"
        )
    }
    missing = expected - names
    extra = names - expected
    if missing or extra:
        raise AssertionError(
            f"index mismatch; missing={sorted(missing)}, extra={sorted(extra)}"
        )
    return f"{len(expected)} named indexes present"


BAD_WRITES = [
    (
        "base_exposure upper bound",
        "update public.tasks set base_exposure = 1.5 where id = 'fa-invoice'",
    ),
    (
        "evidence enum",
        "update public.signals set evidence = 'bogus' "
        "where id = (select min(id) from public.signals)",
    ),
    (
        "resources -> skills foreign key",
        "insert into public.resources (id, skill_id, title, provider, url) "
        "values ('verify-bad', 'no-such-skill', 't', 'p', 'u')",
    ),
    (
        "SDG id check",
        "insert into public.sdgs (id, name, color) values (7, 'x', '#000')",
    ),
    (
        "skills primary key",
        "insert into public.skills (id, name, category, hours_per_level, deliverable, why) "
        "select id, name, category, hours_per_level, deliverable, why "
        "from public.skills limit 1",
    ),
]


def check_constraints(conn: psycopg.Connection) -> str:
    for label, statement in BAD_WRITES:
        try:
            conn.execute(statement)
        except psycopg.Error:
            continue
        raise AssertionError(f"database accepted an invalid write: {label}")

    actual = all_counts(conn)
    if actual != EXPECTED_ROWS:
        raise AssertionError(f"rejected writes left data behind: {actual}")
    return f"{len(BAD_WRITES)} invalid writes rejected, data unchanged"


def check_skill_name_unique(conn: psycopg.Connection) -> str:
    """The migration must reject a duplicate skill name, ignoring case."""
    try:
        conn.execute(
            "insert into public.skills "
            "(id, name, category, hours_per_level, deliverable, why) "
            "select 'verify-dup-name', lower(name), category, hours_per_level, "
            "deliverable, why from public.skills order by id limit 1"
        )
    except psycopg.errors.UniqueViolation:
        return "duplicate skill name rejected"
    else:
        raise AssertionError("database accepted a duplicate skill name")
    finally:
        conn.execute("delete from public.skills where id = 'verify-dup-name'")


def check_numeric_types(conn: psycopg.Connection) -> str:
    from decimal import Decimal

    strength = conn.execute(
        "select strength from public.signals order by id limit 1"
    ).fetchone()[0]
    if not isinstance(strength, Decimal):
        raise AssertionError(f"strength came back as {type(strength).__name__}, expected Decimal")

    as_json = conn.execute(
        "select to_jsonb(strength) from public.signals order by id limit 1"
    ).fetchone()[0]
    if not isinstance(as_json, (int, float)):
        raise AssertionError(f"numeric did not convert to a JSON number: {as_json!r}")
    return f"numeric -> Decimal -> JSON number ({strength})"


def check_anon_read_only(conn: psycopg.Connection) -> str:
    """Emulate Supabase's anon role: SELECT allowed by policy, writes denied."""
    conn.execute("drop role if exists pivott_verify_anon")
    conn.execute("create role pivott_verify_anon nologin")
    try:
        conn.execute("grant usage on schema public to pivott_verify_anon")
        conn.execute("grant select on public.tasks to pivott_verify_anon")
        conn.execute("set role pivott_verify_anon")
        try:
            visible = conn.execute("select count(*) from public.tasks").fetchone()[0]
            if visible != EXPECTED_ROWS["tasks"]:
                raise AssertionError(f"anon should see {EXPECTED_ROWS['tasks']} tasks, saw {visible}")
        finally:
            conn.execute("reset role")

        conn.execute("set role pivott_verify_anon")
        try:
            conn.execute(
                "insert into public.tasks (id, role_id, name, description, base_exposure, "
                "human_judgment, default_share, try_this_week) values "
                "('verify-bad', 'finance-admin', 'x', 'x', 0.5, 0.5, 1, 'x')"
            )
        except psycopg.errors.InsufficientPrivilege:
            pass
        else:
            raise AssertionError("anon was able to INSERT into tasks")
        finally:
            conn.execute("reset role")
    finally:
        conn.execute("reset role")
        conn.execute("revoke all on public.tasks from pivott_verify_anon")
        conn.execute("revoke usage on schema public from pivott_verify_anon")
        conn.execute("drop role if exists pivott_verify_anon")
    return "anon can read, cannot write"


def prepare_supabase_auth(conn: psycopg.Connection) -> str:
    """Create the tiny part of Supabase's ``auth`` schema the migration needs.

    The scratch database is plain PostgreSQL: there is no GoTrue, no
    ``auth.users`` and no ``auth.uid()``. The profiles migration references all
    three, so this stand-in lets the real migration run unchanged. It behaves
    like Supabase's helper when ``request.jwt.claims`` is set.
    """
    conn.execute("create schema if not exists auth")
    conn.execute("create table if not exists auth.users (id uuid primary key)")
    conn.execute(
        "create or replace function auth.uid() returns uuid "
        "language sql stable as $$ "
        "select coalesce("
        "  nullif(current_setting('request.jwt.claim.sub', true), ''),"
        "  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')"
        ")::uuid "
        "$$"
    )
    if conn.execute(
        "select 1 from pg_roles where rolname = 'authenticated'"
    ).fetchone() is None:
        conn.execute("create role authenticated nologin")
    conn.execute("grant usage on schema auth to authenticated")
    conn.execute("grant execute on function auth.uid() to authenticated")
    return "auth.users + auth.uid() stand-in"


def check_profiles(conn: psycopg.Connection) -> str:
    """The profiles migration: table, owner-only RLS, FK and JSONB round-trip."""
    if conn.execute("select to_regclass('public.profiles')").fetchone()[0] is None:
        raise AssertionError("profiles table is missing; 202610231200_profiles.sql did not run")

    policies = conn.execute(
        "select cmd from pg_policies "
        "where schemaname = 'public' and tablename = 'profiles'"
    ).fetchall()
    commands = sorted(row[0] for row in policies)
    if commands != ["DELETE", "INSERT", "SELECT", "UPDATE"]:
        raise AssertionError(f"unexpected profiles policies: {commands}")

    if not conn.execute(
        "select relrowsecurity from pg_class where oid = 'public.profiles'::regclass"
    ).fetchone()[0]:
        raise AssertionError("profiles has RLS disabled")

    foreign_keys = {
        row[0]
        for row in conn.execute(
            "select confrelid::regclass::text from pg_constraint "
            "where conrelid = 'public.profiles'::regclass and contype = 'f'"
        )
    }
    if "auth.users" not in foreign_keys:
        raise AssertionError(f"profiles -> auth.users FK is missing: {foreign_keys}")

    for user_id in (PROFILE_TEST_USER, PROFILE_OTHER_USER):
        conn.execute(
            "insert into auth.users (id) values (%s) on conflict do nothing",
            (user_id,),
        )

    conn.execute(
        "insert into public.profiles "
        "(user_id, email, name, role_id, scenario, hours_per_week, free_only, "
        " target_role_id, selections, skills, completed_steps, custom_tasks, custom_signals) "
        "values (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, "
        "        %s::jsonb, %s::jsonb)",
        (
            PROFILE_TEST_USER,
            "aisyah@example.com",
            "Aisyah",
            "finance-admin",
            "fast",
            8,
            True,
            "operations-coordinator",
            json.dumps([{"taskId": "fa-invoice", "share": 30}]),
            json.dumps({"excel": 3}),
            json.dumps(["sql-1"]),
            json.dumps([{"id": "local-1"}]),
            json.dumps([{"id": "sig-1"}]),
        ),
    )

    stored = conn.execute(
        "select selections, skills, updated_at is not null "
        "from public.profiles where user_id = %s",
        (PROFILE_TEST_USER,),
    ).fetchone()
    if stored[0] != [{"taskId": "fa-invoice", "share": 30}] or stored[1] != {"excel": 3}:
        raise AssertionError(f"profiles JSONB did not round-trip: {stored}")

    conn.execute(
        "select set_config('request.jwt.claims', %s, false)",
        (json.dumps({"sub": PROFILE_TEST_USER}),),
    )
    try:
        conn.execute("set role authenticated")
        visible = conn.execute("select count(*) from public.profiles").fetchone()[0]
        if visible != 1:
            raise AssertionError(f"owner should see 1 profile, saw {visible}")
        if conn.execute(
            "select count(*) from public.profiles where user_id = %s",
            (PROFILE_OTHER_USER,),
        ).fetchone()[0] != 0:
            raise AssertionError("RLS leaked another user's profile")

        conn.execute(
            "update public.profiles set name = 'Aisyah 2' where user_id = %s",
            (PROFILE_TEST_USER,),
        )
        if conn.execute(
            "select name from public.profiles where user_id = %s",
            (PROFILE_TEST_USER,),
        ).fetchone()[0] != "Aisyah 2":
            raise AssertionError("owner could not update their own profile")

        try:
            conn.execute(
                "insert into public.profiles (user_id, role_id) values (%s, %s)",
                (PROFILE_OTHER_USER, "finance-admin"),
            )
        except psycopg.Error:
            pass
        else:
            raise AssertionError("RLS allowed writing another user's profile")

        conn.execute(
            "delete from public.profiles where user_id = %s", (PROFILE_TEST_USER,)
        )
        if conn.execute("select count(*) from public.profiles").fetchone()[0] != 0:
            raise AssertionError("owner could not delete their own profile")
    finally:
        conn.execute("reset role")
        conn.execute("select set_config('request.jwt.claims', '', false)")

    conn.execute("delete from public.profiles where user_id = %s", (PROFILE_OTHER_USER,))
    conn.execute(
        "delete from auth.users where id in (%s, %s)",
        (PROFILE_TEST_USER, PROFILE_OTHER_USER),
    )
    return "profiles table, 4 owner policies, FK, JSONB and RLS isolation"


def check_profiles_orm() -> str:
    """Exercise the real SQLModel/JSON path against PostgreSQL ``jsonb``.

    The raw-SQL check above proves the DDL; this one proves the ORM can bind
    Python lists/dicts into ``jsonb`` and read them back as Python values.
    """
    from sqlalchemy import text
    from sqlmodel import Session

    from app.auth import AuthUser
    from app.db import engine
    from app.schemas import SavedProfileInput
    from app.services.user_profile import delete_profile, get_profile, upsert_profile

    with engine.begin() as connection:
        connection.execute(
            text("insert into auth.users (id) values (:id) on conflict do nothing"),
            {"id": PROFILE_TEST_USER},
        )

    user = AuthUser(
        id=PROFILE_TEST_USER,
        email="aisyah@example.com",
        role="authenticated",
        provider="email",
        expires_at=None,
        claims={},
    )
    payload = SavedProfileInput(
        roleId="finance-admin",
        selections=[{"taskId": "fa-invoice", "share": 30}],
        skills={"excel": 3},
        scenario="fast",
        hoursPerWeek=8,
        freeOnly=True,
        targetRoleId="operations-coordinator",
        name="Aisyah",
        completedSteps=["sql-1"],
        customTasks=[{"id": "local-1"}],
        customSignals=[{"id": "sig-1"}],
    )

    try:
        with Session(engine) as session:
            saved = upsert_profile(session, user, payload)
            if saved.skills != {"excel": 3}:
                raise AssertionError(f"skills did not round-trip: {saved.skills}")
            if saved.selections[0].taskId != "fa-invoice":
                raise AssertionError("selections did not round-trip")
            if saved.completedSteps != ["sql-1"]:
                raise AssertionError("completedSteps did not round-trip")

            record = get_profile(session, PROFILE_TEST_USER)
            if record is None or record.name != "Aisyah":
                raise AssertionError("ORM read did not return the saved row")
            if record.custom_signals != [{"id": "sig-1"}]:
                raise AssertionError("customSignals did not round-trip")

            if delete_profile(session, PROFILE_TEST_USER) is not True:
                raise AssertionError("ORM delete failed")
    finally:
        with engine.begin() as connection:
            connection.execute(
                text("delete from auth.users where id = :id"),
                {"id": PROFILE_TEST_USER},
            )
    return "ORM upsert/read/delete through jsonb"


def check_schema_idempotent(conn: psycopg.Connection) -> str:
    before = all_counts(conn)
    statements = apply_sql_file(conn, SCHEMA_FILE)
    after = all_counts(conn)
    if after != before:
        raise AssertionError(f"re-running schema.sql changed data: {before} -> {after}")
    policies = conn.execute(
        "select count(*) from pg_policies where schemaname = 'public'"
    ).fetchone()[0]
    if policies != EXPECTED_POLICIES:
        raise AssertionError(f"re-running schema.sql left {policies} policies")
    return f"{statements} statements, no data loss"


def check_reset_and_reseed(conn: psycopg.Connection) -> str:
    from sqlmodel import Session

    from app.db import engine, reset_database
    from app.seed import seed_database

    reset_database()  # PostgreSQL branch: TRUNCATE ... RESTART IDENTITY CASCADE
    emptied = all_counts(conn)
    if any(emptied.values()):
        raise AssertionError(f"reset left rows behind: {emptied}")

    with Session(engine) as session:
        inserted = seed_database(session)
    if not inserted:
        raise AssertionError("seed refused to insert after reset")

    restored = all_counts(conn)
    if restored != EXPECTED_ROWS:
        raise AssertionError(f"re-seed mismatch: {restored}")
    return f"TRUNCATE + re-seed restored all {len(EXPECTED_TABLES)} tables"


def check_seed_idempotent() -> str:
    from sqlmodel import Session

    from app.db import engine
    from app.seed import seed_database

    with Session(engine) as session:
        inserted = seed_database(session)
    if inserted:
        raise AssertionError("second seed inserted duplicate rows")
    return "second seed is a no-op"


def check_migrations(conn: psycopg.Connection, report: Report) -> str:
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not files:
        report.skip("migrations", "no migration files; schema.sql is the baseline")
        return ""
    applied = []
    for path in files:
        statements = apply_sql_file(conn, path)
        applied.append(f"{path.name} ({statements})")
    return ", ".join(applied)


def check_api(conn: psycopg.Connection) -> str:
    import warnings

    # Starlette warns about httpx2 when fastapi.testclient is imported;
    # unrelated to the database path this script is verifying.
    warnings.filterwarnings(
        "ignore", message="Using `httpx` with `starlette.testclient` is deprecated"
    )

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as client:
        health = client.get("/api/health")
        if health.status_code != 200:
            raise AssertionError(f"/api/health -> {health.status_code}")
        body = health.json()
        expected_counts = {"roles": 6, "tasks": 31, "skills": 15, "signals": 20}
        if body["counts"] != expected_counts:
            raise AssertionError(f"health counts {body['counts']} != {expected_counts}")

        normal = client.post("/api/analysis", json=AISYAH)
        if normal.status_code != 200:
            raise AssertionError(f"/api/analysis -> {normal.status_code}: {normal.text[:300]}")
        normal_body = normal.json()
        if abs(normal_body["roleExposure"] - 0.619031) > 1e-4:
            raise AssertionError(f"normal roleExposure {normal_body['roleExposure']} != 0.619031")
        if [route["roleId"] for route in normal_body["routes"]] != [
            "operations-coordinator",
            "finance-systems-analyst",
            "marketing-executive",
        ]:
            raise AssertionError(f"unexpected route order: {normal_body['routes']}")

        fsa = next(r for r in normal_body["routes"] if r["roleId"] == "finance-systems-analyst")
        if abs(fsa["fit"] - 56.0) > 0.1 or fsa["weeks"] != 15 or fsa["totalGapHours"] != 90:
            raise AssertionError(f"FSA route drifted: fit={fsa['fit']} weeks={fsa['weeks']} hours={fsa['totalGapHours']}")

        fast = client.post("/api/analysis", json={**AISYAH, "scenario": "fast"}).json()
        if abs(fast["roleExposure"] - 0.763981) > 1e-4:
            raise AssertionError(f"fast roleExposure {fast['roleExposure']} != 0.763981")
        if fast["routes"][0]["roleId"] != "finance-systems-analyst":
            raise AssertionError(f"fast top route is {fast['routes'][0]['roleId']}")

        created = client.post("/api/signals", json=NEW_SIGNAL)
        if created.status_code != 201:
            raise AssertionError(f"POST /api/signals -> {created.status_code}: {created.text[:300]}")
        if created.json()["evidence"] != "user":
            raise AssertionError("new signal is not evidence=user")

        listed = client.get("/api/signals").json()
        if listed["count"] != 21:
            raise AssertionError(f"signal count after insert is {listed['count']}, expected 21")

        recompute = client.post(
            "/api/analysis/recompute",
            json={"profile": AISYAH, "pendingSignalIds": [created.json()["id"]]},
        )
        if recompute.status_code != 200:
            raise AssertionError(f"recompute -> {recompute.status_code}: {recompute.text[:300]}")
        diff = recompute.json()
        if abs(diff["delta"] - 0.026896) > 1e-4:
            raise AssertionError(f"recompute delta {diff['delta']} != 0.026896")

    # Remove the user signal so the final counts match the seed again.
    conn.execute(
        "delete from public.signal_task_impacts where signal_id in "
        "(select id from public.signals where evidence = 'user')"
    )
    conn.execute("delete from public.signals where evidence = 'user'")

    actual = all_counts(conn)
    if actual != EXPECTED_ROWS:
        raise AssertionError(f"API write cleanup left counts at {actual}")
    return "health, analysis (62% / 76.4%), signals write path, recompute"


# ---------------------------------------------------------------------------
# Bootstrap / teardown
# ---------------------------------------------------------------------------


def recreate_database(admin: psycopg.Connection, database: str) -> None:
    name = quote_identifier(database)
    version = admin.execute("show server_version_num").fetchone()[0]
    if int(version) >= 130000:
        admin.execute(f"drop database if exists {name} with (force)")
    else:  # pragma: no cover - PostgreSQL < 13
        admin.execute(
            "select pg_terminate_backend(pid) from pg_stat_activity "
            "where datname = %s and pid <> pg_backend_pid()",
            (database,),
        )
        admin.execute(f"drop database if exists {name}")
    admin.execute(f"create database {name}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--url", help="admin URL of a disposable PostgreSQL server")
    parser.add_argument("--database", default=DEFAULT_DATABASE, help="scratch database name")
    parser.add_argument(
        "--keep",
        action="store_true",
        help="leave the embedded server and scratch database running",
    )
    parser.add_argument(
        "--allow-supabase",
        action="store_true",
        help="allow a *.supabase.co(m) host (only for a disposable staging project)",
    )
    args = parser.parse_args()

    report = Report()
    started = time.perf_counter()
    server = None
    admin = None
    conn = None
    base_url = None

    print("Pivott PostgreSQL verification")
    print(f"  repo:     {ROOT}")
    print(f"  scratch:  database {args.database!r}, dropped afterwards")
    print()

    try:
        if args.url:
            base_url = normalize_url(args.url)
        else:
            server, base_url, _pgdata = start_embedded(keep=args.keep)

        print(f"  server:   {redact(base_url)}")
        assert_disposable(base_url, args.database, args.allow_supabase)

        admin = psycopg.connect(base_url, autocommit=True, connect_timeout=20)
        version = admin.execute("select version()").fetchone()[0]
        print(f"  version:  {version.split(',')[0]}")
        recreate_database(admin, args.database)

        verify_url = with_database(base_url, args.database)
        conn = psycopg.connect(verify_url, autocommit=True, connect_timeout=20)
        print(f"  database: {args.database} (fresh)\n")

        # Guard rail: the app engine must point at the scratch database, never
        # at whatever .env contains.
        os.environ["DATABASE_URL"] = sqlalchemy_url(verify_url)
        os.environ.pop("PIVOTT_DB", None)
        from app.db import engine

        if engine.url.get_backend_name() != "postgresql":
            raise SystemExit(f"app engine is not PostgreSQL: {engine.url}")
        if engine.url.database != args.database:
            raise SystemExit(
                f"app engine points at {engine.url.database!r}, expected {args.database!r}"
            )

        # 1. Baseline schema on an empty database.
        statements = apply_sql_file(conn, SCHEMA_FILE)
        report.pass_("schema.sql on empty database", f"{statements} statements")
        check(report, "tables", lambda: check_tables(conn))
        check(report, "row counts before seed (all empty)", lambda: check_empty(conn))

        # 2. Seed through the real ORM stack.
        from sqlmodel import Session

        from app.seed import seed_database

        with Session(engine) as session:
            inserted = seed_database(session)
        if not inserted:
            raise AssertionError("initial seed was treated as already seeded")
        report.pass_("seed via SQLModel", "initial insert")
        check(report, "row counts after seed", lambda: check_row_counts(conn))
        check(report, "seed idempotency", check_seed_idempotent)

        # 3. PostgreSQL-only behaviours.
        check(report, "RLS + read-only policies", lambda: check_rls(conn))
        check(
            report,
            "baseline named indexes",
            lambda: check_indexes(conn, EXPECTED_INDEXES_BASELINE),
        )
        check(report, "constraints reject invalid writes", lambda: check_constraints(conn))
        check(report, "numeric -> Decimal -> JSON", lambda: check_numeric_types(conn))
        check(report, "anon reads but cannot write", lambda: check_anon_read_only(conn))
        check(report, "schema.sql is idempotent", lambda: check_schema_idempotent(conn))
        check(report, "reset (TRUNCATE) + re-seed", lambda: check_reset_and_reseed(conn))

        # 4. Incremental migrations, applied on top of the baseline. The
        # profiles migration needs the parts of Supabase's auth schema that
        # plain PostgreSQL does not have; stand them in first.
        report.pass_("Supabase auth stand-in", prepare_supabase_auth(conn))
        detail = check_migrations(conn, report)
        if detail:
            report.pass_("migrations", detail)
        check(
            report,
            "post-migration named indexes",
            lambda: check_indexes(conn, EXPECTED_INDEXES_FINAL),
        )
        check(
            report,
            "duplicate skill name rejected",
            lambda: check_skill_name_unique(conn),
        )
        check(report, "profiles migration + RLS", lambda: check_profiles(conn))
        check(report, "profiles ORM round-trip (JSONB)", check_profiles_orm)

        # 5. The API against PostgreSQL, including numeric JSON serialization.
        check(report, "FastAPI smoke test", lambda: check_api(conn))

    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001 - top-level failure
        report.fail("setup", exc)
        traceback.print_exc()
    finally:
        if conn is not None:
            try:
                engine.dispose()  # type: ignore[name-defined]
            except Exception:  # noqa: BLE001
                pass
            conn.close()
        if admin is not None:
            if args.keep:
                print(f"\nkept database {args.database!r}; drop it with:")
                print(f'  drop database "{args.database}";')
            else:
                try:
                    admin.execute(f"drop database if exists {quote_identifier(args.database)} with (force)")
                except Exception as exc:  # noqa: BLE001
                    print(f"warning: could not drop scratch database: {exc}")
            admin.close()
        if server is not None:
            if args.keep:
                print(f"kept embedded server at {redact(base_url or '')}")
            else:
                try:
                    server.cleanup()
                except Exception as exc:  # noqa: BLE001 - never mask check results
                    print(f"warning: embedded PostgreSQL cleanup failed: {exc}")

    elapsed = time.perf_counter() - started
    print()
    print(
        f"summary: {report.passed} passed, {report.failed} failed, "
        f"{report.skipped} skipped in {elapsed:.1f}s"
    )
    if report.failures:
        print("\nfailures:")
        for name, message in report.failures:
            print(f"  - {name}: {message}")
        return 1
    print("PostgreSQL path is healthy.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
