"""Pivott API entry point.

Run locally:
    .venv\\Scripts\\python.exe -m uvicorn app.main:app --reload

Open:
    http://127.0.0.1:8000/docs
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app import runtime
from app.config import CORS_ORIGINS, DATASET, auto_seed
from app.db import engine, get_session, init_db
from app.errors import UnhandledErrorMiddleware, register_error_handlers
from app.models import Role, Signal, Skill, Task
from app.routers import analysis, auth, catalog, live, me, pathways, profiles, signals
from app.schemas import HealthCounts, HealthResponse
from app.seed import ensure_dataset, seed_if_empty


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    with Session(engine) as session:
        ensure_dataset(session)
        if auto_seed():
            seed_if_empty(session)
        runtime.configure_from_session(session)
    yield


app = FastAPI(
    title="Pivott API",
    description=(
        "Task-level AI exposure, adjacent-role matching and reskilling pathways. "
        "The demo dataset is synthetic; all scores are deterministic."
    ),
    version="1.1.0",
    lifespan=lifespan,
)

register_error_handlers(app)

# Added before CORS on purpose: Starlette applies middleware in reverse order,
# so CORSMiddleware ends up outermost and adds its headers to the 5xx responses
# produced by UnhandledErrorMiddleware.
app.add_middleware(UnhandledErrorMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(catalog.router)
app.include_router(profiles.router)
app.include_router(analysis.router)
app.include_router(pathways.router)
app.include_router(signals.router)
app.include_router(live.router)
app.include_router(auth.router)
app.include_router(me.router)


@app.get("/")
def root() -> dict:
    return {
        "name": "Pivott API",
        "version": runtime.seed_version(),
        "dataset": DATASET,
        "docs": "/docs",
        "health": "/api/health",
        "seed": "/api/seed",
        "analysis": "POST /api/analysis",
        "live": "/api/live/status",
        "auth": "/api/auth/me",
        "savedProfile": "/api/me/profile",
    }


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
def health(session: Session = Depends(get_session)) -> HealthResponse:
    seed_signal_count = len(
        session.exec(select(Signal).where(Signal.evidence != "user")).all()
    )
    return HealthResponse(
        status="ok",
        dataset=DATASET,
        seedVersion=runtime.seed_version(),
        dataAsOf=runtime.as_of_iso(),
        counts=HealthCounts(
            roles=len(session.exec(select(Role)).all()),
            tasks=len(session.exec(select(Task)).all()),
            skills=len(session.exec(select(Skill)).all()),
            signals=seed_signal_count,
        ),
    )
