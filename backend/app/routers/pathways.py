from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from app.engine import build_pathway
from app.parsing import ProfileError, decode_id, encode_id, parse_profile, read_json

router = APIRouter()


def _pathway_input(profile: dict) -> dict:
    return {
        "targetRoleId": profile["targetRoleId"],
        "levels": profile["skills"],
        "hoursPerWeek": profile["hoursPerWeek"],
        "freeOnly": profile["freeOnly"],
    }

@router.post("/pathways", status_code=status.HTTP_201_CREATED)
async def create_pathway(request: Request):
    body = await read_json(request)
    try:
        profile = parse_profile(body)
    except ProfileError as error:
        return JSONResponse(status_code=400, content={"error": str(error)})

    if not profile.get("targetRoleId"):
        return JSONResponse(status_code=400, content={"error": "targetRoleId is required"})

    payload = _pathway_input(profile)
    result = build_pathway(
        target_role_id=payload["targetRoleId"],
        levels=payload["levels"],
        hours_per_week=payload["hoursPerWeek"],
        free_only=payload["freeOnly"],
    )
    return {"id": encode_id(payload), **payload, **result}


@router.get("/pathways/{pathway_id}")
def get_pathway(pathway_id: str):
    raw = decode_id(pathway_id)
    if raw is None:
        return JSONResponse(status_code=404, content={"error": "Pathway not found"})

    try:
        profile = parse_profile(
            {"roleId": "finance-admin", "skills": raw.get("levels", {}), **raw}
        )
    except ProfileError:
        return JSONResponse(status_code=404, content={"error": "Pathway not found"})

    if not profile.get("targetRoleId"):
        return JSONResponse(status_code=404, content={"error": "Pathway not found"})

    payload = _pathway_input(profile)
    result = build_pathway(
        target_role_id=payload["targetRoleId"],
        levels=payload["levels"],
        hours_per_week=payload["hoursPerWeek"],
        free_only=payload["freeOnly"],
    )
    return {"id": pathway_id, **payload, **result}
