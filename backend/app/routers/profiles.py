"""Profile validation endpoint.

The demo keeps profiles in browser localStorage; this endpoint only validates
and echoes the normalised profile with a shareable id. Nothing is persisted.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.db import get_session
from app.schemas import ProfileInput, ProfileResponse
from app.services.profile import encode_id, normalize_profile

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    payload: ProfileInput,
    session: Session = Depends(get_session),
) -> ProfileResponse:
    profile = normalize_profile(session, payload)
    return ProfileResponse(
        id=encode_id(profile.model_dump()),
        profile=profile,
        storage="client",
    )
