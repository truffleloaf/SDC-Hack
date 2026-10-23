"""Stateless pathway generation and lookup."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.db import get_session
from app.schemas import PathwayResponse, ProfileInput
from app.services.catalog import find_role
from app.services.pathway import build_pathway
from app.services.profile import (
    decode_id,
    encode_id,
    normalize_profile,
    sanitize_hours,
    sanitize_levels,
)

router = APIRouter(prefix="/api/pathways", tags=["pathways"])


@router.post("", response_model=PathwayResponse, status_code=status.HTTP_201_CREATED)
def create_pathway(
    payload: ProfileInput,
    session: Session = Depends(get_session),
) -> PathwayResponse:
    profile = normalize_profile(session, payload)
    if not profile.targetRoleId:
        raise HTTPException(status_code=400, detail="targetRoleId is required")

    built = build_pathway(
        session,
        target_role_id=profile.targetRoleId,
        levels=profile.skills,
        hours_per_week=profile.hoursPerWeek,
        free_only=profile.freeOnly,
    )
    if built is None:
        raise HTTPException(status_code=400, detail="targetRoleId is required")
    steps, total_hours, weeks = built

    identifier = encode_id(
        {
            "targetRoleId": profile.targetRoleId,
            "levels": profile.skills,
            "hoursPerWeek": profile.hoursPerWeek,
            "freeOnly": profile.freeOnly,
        }
    )
    return PathwayResponse(
        id=identifier,
        targetRoleId=profile.targetRoleId,
        levels=profile.skills,
        hoursPerWeek=profile.hoursPerWeek,
        freeOnly=profile.freeOnly,
        steps=steps,
        totalHours=total_hours,
        weeks=weeks,
    )


@router.get("/{pathway_id}", response_model=PathwayResponse)
def get_pathway(
    pathway_id: str,
    session: Session = Depends(get_session),
) -> PathwayResponse:
    raw = decode_id(pathway_id)
    if raw is None:
        raise HTTPException(status_code=404, detail="Pathway not found")

    target_role_id = raw.get("targetRoleId")
    if not isinstance(target_role_id, str):
        raise HTTPException(status_code=404, detail="Pathway not found")

    if find_role(session, target_role_id) is None:
        raise HTTPException(status_code=404, detail="Pathway not found")

    levels = sanitize_levels(session, raw.get("levels"))
    hours = sanitize_hours(raw.get("hoursPerWeek"))
    free_only = raw.get("freeOnly") is True

    built = build_pathway(
        session,
        target_role_id=target_role_id,
        levels=levels,
        hours_per_week=hours,
        free_only=free_only,
    )
    if built is None:
        raise HTTPException(status_code=404, detail="Pathway not found")
    steps, total_hours, weeks = built

    return PathwayResponse(
        id=pathway_id,
        targetRoleId=target_role_id,
        levels=levels,
        hoursPerWeek=hours,
        freeOnly=free_only,
        steps=steps,
        totalHours=total_hours,
        weeks=weeks,
    )
