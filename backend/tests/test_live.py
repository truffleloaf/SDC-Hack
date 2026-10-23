"""Tests for the live dataset: O*NET parsing, mapping, jobs and the API.

The parser is fed a miniature O*NET archive built in the test, so the suite
never touches the network. The real archive is only used by the CLI.
"""

from __future__ import annotations

import csv
import io
import shutil
import zipfile
from datetime import date
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app import runtime
from app.config import DATA_AS_OF, SEED_VERSION
from app.live.build import BuildError, allocate_shares, build_catalog
from app.live.importer import ImportResult, write_catalog
from app.live.jobs import (
    MatchResult,
    Posting,
    build_title_index,
    demand_from_counts,
    match_postings,
)
from app.live.onet import parse_database
from app.live.roles import LiveRoleSpec
from app.live.scoring import score_task, short_task_name
from app.models import JobPosting, Meta, Role
from app.services.catalog import seed_payload

SPECS = [
    LiveRoleSpec(
        code="11-1111.00",
        slug="admin-clerk",
        family="Office & Admin Support",
        sdgs=(8,),
        aliases=("buchhalter",),
    ),
    LiveRoleSpec(
        code="22-2222.00",
        slug="bi-analyst",
        family="Data & Analysis",
        sdgs=(8, 9),
    ),
]

TASKS_A = [
    ("101", "Enter invoice data into the accounting system.", 4.5),
    ("102", "Check figures and reconcile bank statements.", 4.2),
    ("103", "Advise managers on budget exceptions and negotiate priorities.", 3.9),
    ("104", "Answer customer questions about invoices.", 3.6),
    ("105", "Compile monthly expense reports.", 3.3),
    ("106", "Maintain vendor records.", 3.0),
    ("107", "Prepare payroll summaries.", 2.7),
    ("108", "Resolve escalated billing disputes.", 2.4),
]

TASKS_B = [
    ("201", "Analyze sales data and prepare dashboards.", 4.4),
    ("202", "Present findings to leadership.", 4.1),
    ("203", "Review data quality issues.", 3.8),
    ("204", "Build forecasts for next quarter.", 3.5),
    ("205", "Coordinate with marketing on campaign metrics.", 3.2),
    ("206", "Document reporting definitions.", 2.9),
]

SKILLS = {
    "11-1111.00": [
        ("2.A.1.a", "Reading Comprehension", 3.5, 4.0),
        ("2.A.2.a", "Critical Thinking", 4.0, 5.0),
        ("2.A.1.c", "Writing", 3.2, 4.0),
        ("2.A.1.e", "Mathematics", 3.8, 4.5),
    ],
    "22-2222.00": [
        ("2.A.2.a", "Critical Thinking", 4.2, 5.0),
        ("2.A.1.c", "Writing", 4.0, 5.0),
        ("2.B.4.a", "Judgment and Decision Making", 3.9, 4.0),
        ("2.B.1.a", "Social Perceptiveness", 3.5, 4.0),
    ],
}


def _tsv(columns: list[str], rows: list[dict]) -> str:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=columns, delimiter="\t", lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({column: row.get(column, "") for column in columns})
    return buffer.getvalue()


def _onet_archive(path) -> None:
    with zipfile.ZipFile(path, "w") as archive:
        def add(name: str, columns: list[str], rows: list[dict]) -> None:
            archive.writestr(f"db_test/{name}", _tsv(columns, rows))

        add(
            "Occupation Data.txt",
            ["O*NET-SOC Code", "Title", "Description"],
            [
                {"O*NET-SOC Code": "11-1111.00", "Title": "Test Admin Clerks", "Description": "Admin work."},
                {"O*NET-SOC Code": "22-2222.00", "Title": "Test Analysts", "Description": "Analysis work."},
                {"O*NET-SOC Code": "33-3333.00", "Title": "Unrated Occupations", "Description": "No ratings."},
            ],
        )
        add(
            "Job Zones.txt",
            ["O*NET-SOC Code", "Job Zone"],
            [
                {"O*NET-SOC Code": "11-1111.00", "Job Zone": "3"},
                {"O*NET-SOC Code": "22-2222.00", "Job Zone": "4"},
            ],
        )
        task_rows = [
            {
                "O*NET-SOC Code": code,
                "Task ID": task_id,
                "Task": statement,
                "Task Type": "Core",
            }
            for code, tasks in (("11-1111.00", TASKS_A), ("22-2222.00", TASKS_B))
            for task_id, statement, _importance in tasks
        ] + [
            {"O*NET-SOC Code": "33-3333.00", "Task ID": "301", "Task": "Do unrated work.", "Task Type": "Core"}
        ]
        add(
            "Task Statements.txt",
            ["O*NET-SOC Code", "Task ID", "Task", "Task Type"],
            task_rows,
        )
        rating_rows = [
            {
                "O*NET-SOC Code": code,
                "Task ID": task_id,
                "Scale ID": "IM",
                "Category": "n/a",
                "Data Value": str(importance),
            }
            for code, tasks in (("11-1111.00", TASKS_A), ("22-2222.00", TASKS_B))
            for task_id, _statement, importance in tasks
        ]
        add(
            "Task Ratings.txt",
            ["O*NET-SOC Code", "Task ID", "Scale ID", "Category", "Data Value"],
            rating_rows,
        )

        essential = []
        transferable = []
        for code, skills in SKILLS.items():
            for element_id, name, importance, level in skills:
                target = essential if element_id.startswith("2.A") else transferable
                for scale, value in (("IM", importance), ("LV", level)):
                    target.append(
                        {
                            "O*NET-SOC Code": code,
                            "Element ID": element_id,
                            "Element Name": name,
                            "Scale ID": scale,
                            "Data Value": str(value),
                            "Not Relevant": "N",
                        }
                    )
        skill_columns = [
            "O*NET-SOC Code",
            "Element ID",
            "Element Name",
            "Scale ID",
            "Data Value",
            "Not Relevant",
        ]
        add("Essential Skills.txt", skill_columns, essential)
        add("Transferable Skills.txt", skill_columns, transferable)

        add(
            "Job Titles.txt",
            ["O*NET-SOC Code", "Job Title"],
            [
                {"O*NET-SOC Code": "11-1111.00", "Job Title": "Bookkeeper"},
                {"O*NET-SOC Code": "11-1111.00", "Job Title": "Accounting Clerk"},
                {"O*NET-SOC Code": "22-2222.00", "Job Title": "Business Intelligence Analyst"},
                {"O*NET-SOC Code": "22-2222.00", "Job Title": "Data Analyst"},
            ],
        )
        add(
            "Tasks to DWAs.txt",
            ["O*NET-SOC Code", "Task ID", "DWA Element ID"],
            [
                {"O*NET-SOC Code": "11-1111.00", "Task ID": "101", "DWA Element ID": "4.A.2.a.4.i.3"},
                {"O*NET-SOC Code": "11-1111.00", "Task ID": "102", "DWA Element ID": "4.A.2.a.1.a.1"},
                {"O*NET-SOC Code": "22-2222.00", "Task ID": "201", "DWA Element ID": "4.A.1.a.1.a.1"},
            ],
        )
        add(
            "GWAs to IWAs to DWAs.txt",
            ["GWA Element ID", "IWA Element ID", "DWA Element ID"],
            [
                {"GWA Element ID": "4.A.2.a.4", "IWA Element ID": "4.A.2.a.4.i", "DWA Element ID": "4.A.2.a.4.i.3"},
                {"GWA Element ID": "4.A.2.a.1", "IWA Element ID": "4.A.2.a.1.a", "DWA Element ID": "4.A.2.a.1.a.1"},
                {"GWA Element ID": "4.A.1.a.1", "IWA Element ID": "4.A.1.a.1.a", "DWA Element ID": "4.A.1.a.1.a.1"},
            ],
        )
        add(
            "Essential Skills to Work Activities.txt",
            ["Essential Skills Element ID", "Essential Skills Element Name", "Work Activities Element ID"],
            [
                {"Essential Skills Element ID": "2.A.1.a", "Essential Skills Element Name": "Reading Comprehension", "Work Activities Element ID": "4.A.2.a.4"},
                {"Essential Skills Element ID": "2.A.2.a", "Essential Skills Element Name": "Critical Thinking", "Work Activities Element ID": "4.A.2.a.1"},
                {"Essential Skills Element ID": "2.A.1.c", "Essential Skills Element Name": "Writing", "Work Activities Element ID": "4.A.1.a.1"},
            ],
        )


@pytest.fixture()
def onet_path():
    # The Windows sandbox in this workspace denies the platform temp folder, so
    # fixtures live under the gitignored .tmp/ directory instead of tmp_path.
    folder = Path(__file__).resolve().parents[1] / ".tmp" / "pytest-live" / uuid4().hex
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / "onet.zip"
    _onet_archive(path)
    try:
        yield path
    finally:
        shutil.rmtree(folder, ignore_errors=True)


@pytest.fixture()
def onet_catalog(onet_path):
    return parse_database(onet_path, codes=["11-1111.00", "22-2222.00"])


@pytest.fixture()
def live_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    runtime.configure(data_as_of=DATA_AS_OF, seed_version=SEED_VERSION)


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------


def test_parser_reads_occupations_tasks_and_skills(onet_catalog):
    assert set(onet_catalog.occupations) == {"11-1111.00", "22-2222.00"}
    admin = onet_catalog.get("11-1111.00")
    assert admin.title == "Test Admin Clerks"
    assert admin.job_zone == 3
    assert len(admin.tasks) == 8
    assert admin.tasks[0].task_id == "101"
    assert admin.tasks[0].importance == pytest.approx(4.5)
    assert admin.tasks[0].rated is True
    assert [skill.name for skill in admin.skills][:2] == [
        "Critical Thinking",
        "Mathematics",
    ]
    assert "Bookkeeper" in admin.job_titles


def test_parser_uses_crosswalk_for_task_skills(onet_catalog):
    admin = onet_catalog.get("11-1111.00")
    assert admin.task_skills["101"] == ("Reading Comprehension",)
    assert admin.task_skills["102"] == ("Critical Thinking",)
    # No crosswalk row: fall back to the occupation's most important skills.
    assert admin.task_skills["103"] == (
        "Critical Thinking",
        "Mathematics",
        "Reading Comprehension",
    )


def test_parser_rejects_unknown_codes(onet_path):
    with pytest.raises(Exception):
        parse_database(onet_path, codes=["99-9999.00"])


# ---------------------------------------------------------------------------
# Scoring model
# ---------------------------------------------------------------------------


def test_routine_task_scores_as_automatable():
    score = score_task("Enter invoice data into the accounting system.", job_zone=3)
    assert score.base_exposure >= 0.55
    assert score.human_judgment < 0.40
    assert "enter" in score.automation_cues


def test_judgment_task_scores_as_protect():
    score = score_task(
        "Advise, negotiate, and coordinate with executives on strategy.", job_zone=4
    )
    assert score.human_judgment >= 0.65
    assert score.base_exposure <= 0.20


def test_scoring_is_deterministic():
    first = score_task("Prepare and reconcile monthly reports.", job_zone=4)
    second = score_task("Prepare and reconcile monthly reports.", job_zone=4)
    assert first == second


def test_short_task_name_prefers_a_clean_clause():
    name = short_task_name(
        "Check figures, postings, and documents for correct entry, mathematical accuracy, and proper codes."
    )
    assert name == "Check figures, postings, and documents"
    assert len(
        short_task_name(
            "Supervise the daily operational workflow across multiple regional distribution centers and warehouses"
        )
    ) <= 73


def test_allocate_shares_is_exact():
    shares = allocate_shares([4.5, 4.2, 3.9, 3.6, 3.3, 3.0], total=100)
    assert sum(shares) == 100
    assert all(share >= 1 for share in shares)
    assert shares == sorted(shares, reverse=True)


# ---------------------------------------------------------------------------
# Catalogue build
# ---------------------------------------------------------------------------


def test_build_catalog_maps_roles_tasks_and_requests(onet_catalog):
    catalog = build_catalog(
        onet_catalog,
        demand={"admin-clerk": 100, "bi-analyst": 50},
        specs=SPECS,
        tasks_per_role=6,
        requirements_per_role=3,
    )
    assert [role["id"] for role in catalog.roles] == ["admin-clerk", "bi-analyst"]
    assert [role["demand"] for role in catalog.roles] == [100, 50]
    assert len(catalog.tasks) == 12
    assert len(catalog.role_requirements) == 6
    assert len(catalog.skills) == 5

    for role in catalog.roles:
        shares = [task["default_share"] for task in catalog.tasks if task["role_id"] == role["id"]]
        assert sum(shares) == 100
        assert len(shares) == 6

    skill_ids = {skill["id"] for skill in catalog.skills}
    assert all(row["skill_id"] in skill_ids for row in catalog.task_skills)
    assert all(row["skill_id"] in skill_ids for row in catalog.role_requirements)

    admin_tasks = [task for task in catalog.tasks if task["role_id"] == "admin-clerk"]
    assert admin_tasks[0]["name"] == "Enter invoice data into the accounting system"
    assert "O*NET-SOC 11-1111.00" in admin_tasks[0]["description"]
    assert 0 <= admin_tasks[0]["base_exposure"] <= 1

    provenance = catalog.provenance
    assert provenance["catalog"]["occupations"][0]["code"] == "11-1111.00"
    assert provenance["model"]["exposure"] == "pivott-onet-cues-v1"
    assert provenance["demand"]["status"] == "unavailable"


def test_build_catalog_skips_occupations_without_ratings(onet_catalog):
    specs = SPECS + [
        LiveRoleSpec(code="33-3333.00", slug="unrated", family="Other", sdgs=(8,))
    ]
    catalog = build_catalog(onet_catalog, specs=specs, tasks_per_role=6)
    assert [role["id"] for role in catalog.roles] == ["admin-clerk", "bi-analyst"]
    assert any("33-3333.00" in entry for entry in catalog.skipped)


def test_build_catalog_needs_at_least_one_usable_role(onet_catalog):
    specs = [LiveRoleSpec(code="33-3333.00", slug="unrated", family="Other", sdgs=(8,))]
    with pytest.raises(BuildError):
        build_catalog(onet_catalog, specs=specs)


# ---------------------------------------------------------------------------
# Job source
# ---------------------------------------------------------------------------


def _posting(identifier: str, title: str, posted: str = "2026-10-20") -> Posting:
    return Posting(
        id=identifier,
        title=title,
        company="Acme",
        location="Berlin",
        url=f"https://example.test/{identifier}",
        posted_at=posted,
        remote=False,
        tags=(),
        description="",
    )


def test_longest_title_match_wins_and_aliases_work():
    index = build_title_index(
        {
            "admin-clerk": ("Bookkeeper", "Accounting Clerk"),
            "bi-analyst": ("Analyst", "Business Intelligence Analyst", "Data Analyst"),
        },
        {"admin-clerk": ("buchhalter",)},
    )
    postings = [
        _posting("1", "Senior Bookkeeper (m/w/d)"),
        _posting("2", "Business Intelligence Analyst"),
        _posting("3", "Buchhalter (m/w/d)"),
        _posting("4", "Office Assistant"),
    ]
    result = match_postings(postings, index)
    assert result.counts == {"admin-clerk": 2, "bi-analyst": 1}
    assert result.matched == 3
    assert result.unmatched == 1


def test_demand_is_relative_to_the_top_role():
    assert demand_from_counts({"a": 10, "b": 5}, ["a", "b", "c"]) == {
        "a": 100,
        "b": 50,
        "c": 1,
    }
    assert demand_from_counts({}, ["a", "b"]) == {"a": 50, "b": 50}


# ---------------------------------------------------------------------------
# Importer + read path
# ---------------------------------------------------------------------------


def test_import_writes_a_complete_live_catalogue(onet_catalog, live_db):
    catalog = build_catalog(
        onet_catalog,
        demand={"admin-clerk": 80, "bi-analyst": 40},
        matches=MatchResult(
            counts={"admin-clerk": 2},
            postings_by_role={
                "admin-clerk": [
                    (_posting("p1", "Bookkeeper"), "bookkeeper"),
                    (_posting("p2", "Accounting Clerk"), "accounting clerk"),
                ]
            },
            matched=2,
            unmatched=0,
            method="test",
        ),
        specs=SPECS,
        tasks_per_role=6,
        requirements_per_role=3,
    )
    result = ImportResult(
        catalog=catalog, onet=onet_catalog, version="onet-test", as_of=date(2026, 10, 23)
    )

    with Session(live_db) as session:
        counts = write_catalog(session, result, allow_demo=True)
        assert counts["roles"] == 2
        assert counts["tasks"] == 12
        assert counts["postings"] == 2

        payload = seed_payload(session)
        assert len(payload["roles"]) == 2
        assert len(payload["tasks"]) == 12
        assert len(payload["skills"]) == 5
        assert payload["demoPersona"] is None
        assert len(payload["scenarios"]) == 2
        assert len(payload["sdgs"]) == 4
        assert session.get(Role, "admin-clerk") is not None
        postings = session.exec(select(JobPosting)).all()
        assert {row.id for row in postings} == {"p1", "p2"}

        meta = {row.key: row.value for row in session.exec(select(Meta)).all()}
        assert meta["dataset"] == "live"
        assert meta["seed_version"] == "onet-test"
        assert "O*NET" in meta["live_source"]


def test_import_refuses_a_demo_database(onet_catalog, live_db):
    catalog = build_catalog(onet_catalog, specs=SPECS)
    result = ImportResult(catalog=catalog, onet=onet_catalog, version="onet-test", as_of=date(2026, 10, 23))
    with Session(live_db) as session:
        session.add(Role(id="demo-role", title="Demo", family="Demo", demand=1, sort_order=0))
        session.commit()
        session.merge(Meta(key="dataset", value="demo"))
        session.commit()
        with pytest.raises(Exception):
            write_catalog(session, result, allow_demo=True)


# ---------------------------------------------------------------------------
# API surface (demo process)
# ---------------------------------------------------------------------------


def test_live_status_in_demo_mode(client):
    response = client.get("/api/live/status")
    assert response.status_code == 200
    body = response.json()
    assert body["dataset"] == "demo"
    assert body["imported"] is False
    assert body["counts"]["roles"] == 6
    assert body["counts"]["postings"] == 0


def test_live_jobs_in_demo_mode_are_empty(client):
    response = client.get("/api/live/jobs")
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 0
    assert body["postings"] == []


def test_live_jobs_rejects_unknown_role(client):
    response = client.get("/api/live/jobs", params={"roleId": "nope"})
    assert response.status_code == 404
