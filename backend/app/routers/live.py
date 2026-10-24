"""Live dataset endpoints: provenance and the real postings behind demand."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, func, select

from app import runtime
from app.config import DATASET
from app.db import get_session
from app.live.importer import live_meta
from app.models import JobPosting, Role, Signal, Skill, Task
from app.schemas import LiveJobsResponse, LivePostingRead, LiveStatusResponse

router = APIRouter(prefix="/api/live", tags=["live"])


def _count(session: Session, model) -> int:
    return int(session.exec(select(func.count()).select_from(model)).one())


@router.get("/status", response_model=LiveStatusResponse)
def live_status(session: Session = Depends(get_session)) -> LiveStatusResponse:
    """What the live database was built from, when, and how many rows it holds."""
    meta = live_meta(session)
    return LiveStatusResponse(
        dataset=DATASET,
        imported=bool(meta),
        seedVersion=runtime.seed_version(),
        dataAsOf=runtime.as_of_iso(),
        counts={
            "roles": _count(session, Role),
            "tasks": _count(session, Task),
            "skills": _count(session, Skill),
            "signals": int(
                session.exec(
                    select(func.count()).select_from(Signal).where(Signal.evidence != "user")
                ).one()
            ),
            "postings": _count(session, JobPosting),
        },
        catalog=meta.get("catalog"),
        demand=meta.get("demand"),
        model=meta.get("model"),
        trends=meta.get("trends"),
    )


@router.get("/jobs", response_model=LiveJobsResponse)
def live_jobs(
    roleId: str | None = Query(default=None, description="Filter by role id"),
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> LiveJobsResponse:
    """A sample of the real postings matched to a role's demand score."""
    if roleId is not None and session.get(Role, roleId) is None:
        raise HTTPException(status_code=404, detail="Role not found")

    query = select(JobPosting)
    if roleId is not None:
        query = query.where(JobPosting.role_id == roleId)
    total = int(session.exec(select(func.count()).select_from(query.subquery())).one())
    rows = session.exec(
        query.order_by(JobPosting.posted_at.desc(), JobPosting.title).limit(limit)
    ).all()

    return LiveJobsResponse(
        dataset=DATASET,
        asOf=runtime.as_of_iso(),
        count=total,
        postings=[
            LivePostingRead(
                id=row.id,
                roleId=row.role_id,
                title=row.title,
                company=row.company,
                location=row.location,
                url=row.url,
                postedAt=row.posted_at,
                remote=row.remote,
                tags=[tag.strip() for tag in row.tags.split(",") if tag.strip()],
                matchedTitle=row.matched_title,
            )
            for row in rows
        ],
    )
