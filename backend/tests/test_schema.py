"""Schema-level invariants that are not tied to a specific API endpoint."""

from __future__ import annotations

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.db import engine
from app.models import Skill


def test_skill_name_is_case_insensitively_unique(client):
    # The ``client`` fixture resets + seeds the in-memory SQLite database, so
    # the seed's skill named "SQL" is already present.
    with Session(engine) as session:
        session.add(
            Skill(
                id="test-dup-skill",
                name="sql",
                category="Technical",
                hours_per_level=1,
                deliverable="x",
                why="x",
            )
        )
        with pytest.raises(IntegrityError):
            session.commit()
