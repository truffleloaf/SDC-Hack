"""Scoring constants and API limits for the Pivott demo.

All numbers here are part of the public demo behaviour: the same input must
produce the same output, and the Why sheet must be able to show every weight.
"""

from __future__ import annotations

import os
import re
from datetime import date

from app import seed_data

# Signal decay and clamp
HALF_LIFE_DAYS = 180
MAX_SIGNAL_ADJUSTMENT = 0.20

# Classification thresholds
AUTOMATE_EXPOSURE = 0.65
AUTOMATE_JUDGMENT = 0.40
PROTECT_JUDGMENT = 0.65

# fit = 100 × (FIT_SKILL_WEIGHT × coverage + FIT_SIMILARITY_WEIGHT × similarity)
FIT_SKILL_WEIGHT = 0.80
FIT_SIMILARITY_WEIGHT = 0.20

# route_score = ROUTE_FIT_WEIGHT × fit + ROUTE_EXPOSURE_WEIGHT × 100 × (1 − exposure)
ROUTE_FIT_WEIGHT = 0.70
ROUTE_EXPOSURE_WEIGHT = 0.30
ROUTE_LIMIT = 3

# Profile input limits (API). The UI slider is 2–20; the API accepts 1–40.
DEFAULT_HOURS_PER_WEEK = 6
MIN_HOURS_PER_WEEK = 1
MAX_HOURS_PER_WEEK = 40
MAX_SKILL_LEVEL = 4
MAX_SELECTIONS = 20

# Confidence bands (share of time covered by signals / verified signal weight)
CONFIDENCE_HIGH_COVERAGE = 0.80
CONFIDENCE_HIGH_VERIFIED = 0.60
CONFIDENCE_MEDIUM_COVERAGE = 0.50

# "Skills that stay": weighted exposure below this and self-rating at least 2
STAY_EXPOSURE = 0.55
STAY_MIN_LEVEL = 2
REINFORCE_LIMIT = 4

# Signal evidence values
EVIDENCE_VERIFIED = "verified"
EVIDENCE_ILLUSTRATIVE = "illustrative"
EVIDENCE_USER = "user"
EVIDENCE_VALUES = (EVIDENCE_VERIFIED, EVIDENCE_ILLUSTRATIVE, EVIDENCE_USER)

# ---------------------------------------------------------------------------
# Dataset selection: demo catalogue vs live (real) catalogue
# ---------------------------------------------------------------------------

DATASETS = ("demo", "live")
DATASET = (os.getenv("PIVOTT_DATASET", "demo").strip().lower() or "demo")
if DATASET not in DATASETS:
    raise RuntimeError(
        f"PIVOTT_DATASET must be one of {DATASETS}, got {DATASET!r}"
    )


def env_flag(name: str, default: bool) -> bool:
    """Read a boolean environment variable with an explicit default."""
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off", ""}


def is_demo() -> bool:
    return DATASET == "demo"


def auto_seed() -> bool:
    """Seed the built-in demo catalogue on startup.

    Always false for the live dataset: a live process must never insert the
    synthetic demo rows into its database. ``PIVOTT_AUTO_SEED=false`` also
    works for demo deployments that are seeded out of band.
    """
    return is_demo() and env_flag("PIVOTT_AUTO_SEED", True)


# Fallbacks when the database has no meta row yet (demo deployments always do
# after seeding). Live deployments should set both explicitly.
DEFAULT_DATA_AS_OF = seed_data.DATA_AS_OF
DEFAULT_SEED_VERSION = seed_data.SEED_VERSION

DATA_AS_OF = os.getenv("PIVOTT_DATA_AS_OF") or (
    DEFAULT_DATA_AS_OF if is_demo() else date.today().isoformat()
)
SEED_VERSION = os.getenv("PIVOTT_SEED_VERSION") or (
    DEFAULT_SEED_VERSION if is_demo() else "live"
)


# ---------------------------------------------------------------------------
# Runtime settings (environment)
# ---------------------------------------------------------------------------


def allow_demo_reset() -> bool:
    """Whether ``POST /api/seed`` may reset the demo dataset.

    False for the live dataset (there is nothing to reset), and false when the
    deployment sets ``ALLOW_DEMO_RESET=false``.
    """
    if not is_demo():
        return False
    return env_flag("ALLOW_DEMO_RESET", True)


def cors_origins() -> list[str]:
    """Allowed browser origins, comma-separated; ``*`` keeps local demos simple."""
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if not raw or raw == "*":
        return ["*"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


CORS_ORIGINS = cors_origins()


# ---------------------------------------------------------------------------
# Supabase Auth (optional: the demo can run without a Supabase project)
# ---------------------------------------------------------------------------

# Supabase project refs are short lowercase alphanumeric ids. These patterns
# recognise the two connection-string shapes the dashboard offers:
#   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com
#   postgresql://postgres:<password>@db.<ref>.supabase.co
_SUPABASE_POOLER_RE = re.compile(r"postgres\.([a-z0-9]{10,32})[:@]")
_SUPABASE_DB_HOST_RE = re.compile(r"db\.([a-z0-9]{10,32})\.supabase\.co")


def _database_url_env() -> str:
    """The configured database URL, read lazily (``.env`` loads later)."""
    return (
        os.getenv("PIVOTT_DB")
        or os.getenv("TASK_SHIFT_DB")
        or os.getenv("DATABASE_URL")
        or ""
    ).strip()


def supabase_project_ref() -> str:
    """Best-effort project ref from ``SUPABASE_URL`` or the database URL."""
    explicit = (os.getenv("SUPABASE_URL") or "").strip()
    match = re.search(r"https?://([a-z0-9]{10,32})\.supabase\.(?:co|in)", explicit)
    if match:
        return match.group(1)
    database_url = _database_url_env()
    for pattern in (_SUPABASE_POOLER_RE, _SUPABASE_DB_HOST_RE):
        match = pattern.search(database_url)
        if match:
            return match.group(1)
    return ""


def supabase_url() -> str:
    """Supabase API base URL, with ``/auth/v1``-less trailing slash removed.

    ``SUPABASE_URL`` wins. When it is unset, the project ref is inferred from
    the Supabase connection string so a project that already works for the
    database also works for Auth without a second variable.
    """
    explicit = (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")
    if explicit:
        return explicit
    ref = supabase_project_ref()
    return f"https://{ref}.supabase.co" if ref else ""


def supabase_anon_key() -> str:
    """Public key used by the browser to sign in; safe to expose.

    Supabase's newer projects call this the *publishable* key
    (``sb_publishable_...``); older projects call it the *anon* key (a long
    ``eyJ...`` JWT). Either works here, and either env name is accepted.
    """
    return (
        os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("SUPABASE_PUBLISHABLE_KEY")
        or ""
    ).strip()


def supabase_jwt_secret() -> str:
    """Legacy HS256 JWT secret. Server-side only; new projects use JWKS."""
    return (os.getenv("SUPABASE_JWT_SECRET") or "").strip()


def supabase_jwks_ttl() -> int:
    """Seconds to cache the project's JWKS (30–3600, default 300)."""
    raw = os.getenv("SUPABASE_JWKS_TTL_SECONDS", "300")
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return 300
    return max(30, min(3600, value))
