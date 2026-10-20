from fastapi import APIRouter

from app.seed import ROLES, SDGS

router = APIRouter()


@router.get("/sdgs")
def list_sdgs() -> dict:
    return {
        "sdgs": [
            {
                **sdg,
                "roles": [role["id"] for role in ROLES if sdg["id"] in role["sdgs"]],
            }
            for sdg in SDGS
        ]
    }
