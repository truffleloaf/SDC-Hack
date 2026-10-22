"""Pivott API.

FastAPI backend that mirrors the Next.js Route Handlers in
``pivott-web-application-design/app/api/*``. Same seed data, same formulas,
same request/response shapes.

Run:
    uvicorn app.main:app --reload --port 8000
    open http://127.0.0.1:8000/docs
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analysis, health, pathways, profiles, roles, seed, signals, sdgs

app = FastAPI(
    title="Pivott API",
    description=(
        "Task-level AI exposure, adjacent-role matching and reskilling pathways. "
        "Deterministic scoring engine, versioned seed data, no LLM."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip() for origin in os.getenv(
            "PIVOTT_CORS_ORIGINS",
            "https://pivottstudio.vercel.app,http://localhost:3000,http://127.0.0.1:3000",
        ).split(",") if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router, tag in (
    (health.router, "system"),
    (seed.router, "seed"),
    (profiles.router, "profiles"),
    (analysis.router, "analysis"),
    (pathways.router, "pathways"),
    (roles.router, "roles"),
    (signals.router, "signals"),
    (sdgs.router, "sdgs"),
):
    app.include_router(router, prefix="/api", tags=[tag])


@app.get("/", tags=["system"])
def root() -> dict:
    return {
        "name": "Pivott API",
        "docs": "/docs",
        "health": "/api/health",
        "seed": "/api/seed",
    }
