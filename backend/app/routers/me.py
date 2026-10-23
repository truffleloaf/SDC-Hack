"""Endpoints for the signed-in user's saved data.

Every route resolves the user from the verified Supabase access token; the
request body never carries a user id. The catalogue and the stateless scoring
endpoints stay public so the demo still works without an account.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.auth import AuthUser, get_current_user
from app.db import get_session
from app.schemas import (
    DeleteProfileResponse,
    SavedProfileInput,
    SavedProfileResponse,
)
from app.services import user_profile

router = APIRouter(prefix="/api/me", tags=["me"])


@router.get("/profile", response_model=SavedProfileResponse)
def read_saved_profile(
    user: AuthUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> SavedProfileResponse:
    """Return the signed-in user's saved profile, or 404 before the first save."""
    record = user_profile.get_profile(session, user.id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    return user_profile.to_response(record)


@router.put("/profile", response_model=SavedProfileResponse)
def save_profile(
    payload: SavedProfileInput,
    user: AuthUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> SavedProfileResponse:
    """Create or replace the signed-in user's profile.

    The body is the same ``ProfileInput`` the stateless endpoints accept, plus
    ``name``, ``completedSteps``, ``customTasks`` and ``customSignals``. The
    profile is validated against the current catalogue before it is stored.
    """
    return user_profile.upsert_profile(session, user, payload)


@router.delete("/profile", response_model=DeleteProfileResponse)
def delete_saved_profile(
    user: AuthUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> DeleteProfileResponse:
    """Delete the signed-in user's saved profile (idempotent)."""
    deleted = user_profile.delete_profile(session, user.id)
    return DeleteProfileResponse(deleted=deleted)
