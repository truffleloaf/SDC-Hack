from fastapi import APIRouter

from app.seed import DATA_AS_OF, ROLES, SEED_VERSION, SIGNALS, SKILLS, TASKS

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "seedVersion": SEED_VERSION,
        "dataAsOf": DATA_AS_OF,
        "counts": {
            "roles": len(ROLES),
            "tasks": len(TASKS),
            "skills": len(SKILLS),
            "signals": len(SIGNALS),
        },
    }
