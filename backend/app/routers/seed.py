from fastapi import APIRouter

from app.seed import DEMO_PERSONA, SEED_PAYLOAD, SEED_VERSION

router = APIRouter()


@router.get("/seed")
def get_seed() -> dict:
    """Full, versioned seed dataset (same shape as the frontend's GET /api/seed)."""
    return SEED_PAYLOAD


@router.post("/seed")
def reset_seed() -> dict:
    """Stateless reset: clients clear local storage; the server returns the demo persona."""
    return {"reset": True, "version": SEED_VERSION, "demoPersona": DEMO_PERSONA}
