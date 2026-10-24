"""Pydantic request/response schemas for the demo API.

Field names are camelCase on purpose: the frontend demo's route handlers and
``lib/engine.ts`` use camelCase, and the API is a drop-in replacement for them.
"""

from __future__ import annotations

from datetime import date as date_type
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ScenarioId = Literal["normal", "fast"]
Classification = Literal["Automate", "Augment", "Protect"]
Confidence = Literal["High", "Medium", "Low"]
Evidence = Literal["verified", "illustrative", "assumption", "user"]


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------


class ProfileInput(BaseModel):
    """Raw profile body accepted by profiles / analysis / pathways.

    Validation is deliberately permissive and mirrors the frontend
    ``parseProfile``: unknown selections and skills are filtered later, shares
    are clamped, and only ``roleId`` is a hard requirement.
    """

    roleId: str = ""
    selections: list[dict[str, Any]] = Field(default_factory=list)
    skills: dict[str, Any] = Field(default_factory=dict)
    scenario: str = "normal"
    hoursPerWeek: Any = 6
    freeOnly: bool = False
    routeLimit: int = 3
    ignoreTrendSignals: bool = False
    sdgFocus: list[int] = Field(default_factory=list)
    targetRoleId: str | None = None


class Selection(BaseModel):
    taskId: str
    share: float


class NormalizedProfile(BaseModel):
    roleId: str
    selections: list[Selection]
    skills: dict[str, int]
    scenario: ScenarioId
    hoursPerWeek: int
    freeOnly: bool
    routeLimit: int = 3
    ignoreTrendSignals: bool = False
    sdgFocus: list[int] = Field(default_factory=list)
    targetRoleId: str | None = None


class SignalImpactInput(BaseModel):
    taskId: str
    impact: float


class SignalCreate(BaseModel):
    date: date_type
    headline: str
    sourceName: str
    sourceUrl: str
    direction: int
    strength: float
    impacts: list[SignalImpactInput] = Field(default_factory=list)
    explanation: str = ""


class RecomputeRequest(BaseModel):
    profile: ProfileInput
    pendingSignalIds: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Shared read models
# ---------------------------------------------------------------------------


class SkillRead(BaseModel):
    sdgs: list[int]
    id: str
    name: str
    category: str
    hoursPerLevel: int
    deliverable: str


class RoleRequirementRead(BaseModel):
    skillId: str
    requiredLevel: int
    importance: int


class RoleRead(BaseModel):
    id: str
    title: str
    family: str
    demand: int
    sdgs: list[int]
    requirements: list[RoleRequirementRead]


class TaskRead(BaseModel):
    id: str
    roleId: str
    name: str
    description: str
    baseExposure: float
    humanJudgment: float
    defaultShare: int
    skills: list[str]
    tryThisWeek: str


class ResourceRead(BaseModel):
    id: str
    skillId: str
    title: str
    provider: str
    url: str
    free: bool


class ScenarioRead(BaseModel):
    id: str
    label: str
    multiplier: float
    description: str


class SDGRead(BaseModel):
    id: int
    name: str
    color: str
    roles: list[str] = Field(default_factory=list)


class SignalImpactRead(BaseModel):
    taskId: str
    impact: float


class SignalRead(BaseModel):
    id: str
    date: date_type | None = None
    headline: str
    sourceName: str | None = None
    sourceUrl: str | None = None
    assumptionWeight: float | None = None
    direction: int
    strength: float
    impacts: list[SignalImpactRead]
    explanation: str
    evidence: Evidence
    recency: float | None = None


class DemoPersonaRead(BaseModel):
    name: str
    roleId: str
    skills: dict[str, int]


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------


class ScoredTask(BaseModel):
    id: str
    name: str
    description: str
    share: float
    baseExposure: float
    adjustment: float
    exposure: float
    humanJudgment: float
    classification: Classification
    skills: list[str]
    tryThisWeek: str
    custom: bool = False


class SkillGap(BaseModel):
    skillId: str
    name: str
    current: int
    required: int
    gap: int
    importance: int
    priority: float
    hours: int


class RouteResult(BaseModel):
    roleId: str
    title: str
    family: str
    demand: int
    coverage: float
    similarity: float | None
    fit: float
    fitLow: float
    fitHigh: float
    ratedShare: float
    unknownSkillIds: list[str]
    targetExposure: float
    score: float
    unadjustedScore: float
    unadjustedRank: int
    sdgBonus: float
    gaps: list[SkillGap]
    totalGapHours: int
    weeks: int
    sdgs: list[int]


class AnalysisResponse(BaseModel):
    scenario: ScenarioId
    roleExposure: float
    confidence: Confidence
    tasks: list[ScoredTask]
    routes: list[RouteResult]
    illustrative: bool = True


class RoleTasksResponse(BaseModel):
    role: RoleRead
    scenario: ScenarioId
    roleExposure: float
    tasks: list[ScoredTask]


# ---------------------------------------------------------------------------
# Profiles / pathways
# ---------------------------------------------------------------------------


class ProfileResponse(BaseModel):
    id: str
    profile: NormalizedProfile
    storage: Literal["client"] = "client"


class SavedProfileInput(ProfileInput):
    """A profile plus the demo's local UI state, saved for one signed-in user.

    The camelCase fields mirror ``ProfileInput``; the extra fields are the
    pieces the frontend keeps in ``localStorage`` today (display name,
    completed pathway steps, custom tasks/signals). Only the token's ``sub``
    decides which row is written — there is no user id in the body.
    """

    name: str = Field(default="", max_length=80)
    completedSteps: list[str] = Field(default_factory=list, max_length=200)
    customTasks: list[dict[str, Any]] = Field(default_factory=list, max_length=50)
    customSignals: list[dict[str, Any]] = Field(default_factory=list, max_length=100)


class SavedProfileResponse(BaseModel):
    userId: str
    email: str | None = None
    name: str = ""
    roleId: str
    selections: list[Selection]
    skills: dict[str, int]
    scenario: ScenarioId
    hoursPerWeek: int
    freeOnly: bool
    routeLimit: int = 3
    ignoreTrendSignals: bool = False
    sdgFocus: list[int] = Field(default_factory=list)
    targetRoleId: str | None = None
    completedSteps: list[str]
    customTasks: list[dict[str, Any]]
    customSignals: list[dict[str, Any]]
    storage: Literal["server"] = "server"
    createdAt: datetime
    updatedAt: datetime


class DeleteProfileResponse(BaseModel):
    deleted: bool


class ResourceLink(BaseModel):
    title: str
    provider: str
    url: str
    free: bool


class PathwayStep(BaseModel):
    id: str
    skillId: str
    title: str
    skills: list[str]
    resource: ResourceLink | None
    hours: int
    startWeek: int
    endWeek: int
    deliverable: str
    current: int
    required: int


class PathwayResponse(BaseModel):
    id: str
    targetRoleId: str
    levels: dict[str, int]
    hoursPerWeek: int
    freeOnly: bool
    steps: list[PathwayStep]
    totalHours: int
    weeks: int


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class AuthConfigResponse(BaseModel):
    """Public Supabase settings the browser needs to start a sign-in.

    ``anonKey`` is the publishable key (protected by RLS, never the service
    role key). It is ``None`` when the deployment only configured the backend
    for token verification.
    """

    url: str
    anonKey: str | None = None
    authEnabled: bool
    signInEnabled: bool


class AuthUserResponse(BaseModel):
    id: str
    email: str | None = None
    role: str = "authenticated"
    provider: str | None = None
    expiresAt: datetime | None = None


class SignInRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=200)


class SignUpRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=6, max_length=200)


class RefreshTokenRequest(BaseModel):
    refreshToken: str = Field(min_length=10, max_length=4096)


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class AuthSessionUser(BaseModel):
    id: str
    email: str | None = None
    role: str = "authenticated"
    provider: str | None = None
    emailConfirmed: bool | None = None


class AuthSessionResponse(BaseModel):
    accessToken: str
    refreshToken: str
    tokenType: str = "bearer"
    expiresIn: int
    user: AuthSessionUser


class SignUpResponse(BaseModel):
    needsEmailConfirmation: bool
    user: AuthSessionUser
    session: AuthSessionResponse | None = None


class SignOutResponse(BaseModel):
    signedOut: bool


class PasswordResetResponse(BaseModel):
    sent: bool


# ---------------------------------------------------------------------------
# System / seed
# ---------------------------------------------------------------------------


class HealthCounts(BaseModel):
    roles: int
    tasks: int
    skills: int
    signals: int


class HealthResponse(BaseModel):
    status: str
    dataset: str
    seedVersion: str
    dataAsOf: str
    counts: HealthCounts


class SeedResetResponse(BaseModel):
    reset: bool
    version: str
    demoPersona: DemoPersonaRead | None = None


class SignalsResponse(BaseModel):
    asOf: str
    count: int
    signals: list[SignalRead]


class SDGsResponse(BaseModel):
    sdgs: list[SDGRead]


# ---------------------------------------------------------------------------
# Recompute diff
# ---------------------------------------------------------------------------


class RecomputeSide(BaseModel):
    roleExposure: float
    tasks: list[ScoredTask]


class ChangedTask(BaseModel):
    taskId: str
    name: str
    before: float
    after: float


class RecomputeResponse(BaseModel):
    before: RecomputeSide
    after: RecomputeSide
    delta: float
    changed: list[ChangedTask]


# ---------------------------------------------------------------------------
# Live dataset
# ---------------------------------------------------------------------------


class LivePostingRead(BaseModel):
    id: str
    roleId: str
    title: str
    company: str
    location: str
    url: str
    postedAt: date_type
    remote: bool
    tags: list[str]
    matchedTitle: str


class LiveJobsResponse(BaseModel):
    dataset: str
    asOf: str
    count: int
    postings: list[LivePostingRead]


class LiveStatusResponse(BaseModel):
    dataset: str
    imported: bool
    seedVersion: str
    dataAsOf: str
    counts: dict[str, int]
    catalog: dict[str, Any] | None = None
    demand: dict[str, Any] | None = None
    model: dict[str, Any] | None = None
    trends: dict[str, Any] | None = None
