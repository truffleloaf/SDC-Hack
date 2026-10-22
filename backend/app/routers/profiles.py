from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from app.parsing import ProfileError, encode_id, parse_profile, read_json

router = APIRouter()


@router.post("/profiles", status_code=status.HTTP_201_CREATED)
async def create_profile(request: Request):
    body = await read_json(request)
    try:
        profile = parse_profile(body)
    except ProfileError as error:
        return JSONResponse(status_code=400, content={"error": str(error)})
    return {"id": encode_id(profile), "profile": profile, "storage": "client"}
