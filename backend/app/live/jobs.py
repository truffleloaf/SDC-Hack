"""Live job postings: Arbeitnow (no key) and optional Adzuna (key).

Arbeitnow's public board is the default demand source: 300 postings per page,
updated hourly, no credentials. Adzuna is supported when
``ADZUNA_APP_ID``/``ADZUNA_APP_KEY`` are present, because it returns a real
``count`` per search term instead of a fixed page.

Postings are matched to an O*NET occupation by title. The index is built from
O*NET's own reported job titles plus a short list of German/English aliases per
role (see :mod:`app.live.roles`); the longest matching title wins, so
"business intelligence analyst" beats "analyst".
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path

ARBEITNOW_URL = "https://www.arbeitnow.com/api/job-board-api"
ADZUNA_URL = "https://api.adzuna.com/v1/api/jobs/{country}/search/{page}"
ADZUNA_TERMS_URL = "https://developer.adzuna.com/"
DEFAULT_COUNTRY = "de"


class JobSourceError(RuntimeError):
    """Raised when a job source cannot be reached or returns bad data."""


@dataclass(frozen=True)
class Posting:
    id: str
    title: str
    company: str
    location: str
    url: str
    posted_at: str
    remote: bool
    tags: tuple[str, ...]
    description: str

    def to_row(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "url": self.url,
            "posted_at": date.fromisoformat(self.posted_at),
            "remote": self.remote,
            "tags": ", ".join(self.tags),
        }


@dataclass(frozen=True)
class MatchResult:
    counts: dict[str, int]
    postings_by_role: dict[str, list[tuple[Posting, str]]]
    matched: int
    unmatched: int
    method: str


def _normalise(value: str) -> str:
    text = value.lower()
    text = re.sub(r"\(.*?\)", " ", text)
    text = re.sub(r"[^a-z0-9\u00e0-\u00ff/ ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _posted_date(raw: object) -> str:
    if isinstance(raw, (int, float)):
        return datetime.fromtimestamp(raw, tz=timezone.utc).date().isoformat()
    if isinstance(raw, str):
        text = raw.strip()
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(text[:19], fmt).date().isoformat()
            except ValueError:
                continue
        try:
            return date.fromisoformat(text[:10]).isoformat()
        except ValueError:
            pass
    return date.today().isoformat()


def postings_from_arbeitnow(payloads: list[dict]) -> list[Posting]:
    """Normalise Arbeitnow API pages into :class:`Posting` objects."""
    seen: set[str] = set()
    postings: list[Posting] = []
    for payload in payloads:
        for job in payload.get("data", []) or []:
            slug = str(job.get("slug") or "").strip()
            title = str(job.get("title") or "").strip()
            if not slug or not title or slug in seen:
                continue
            seen.add(slug)
            postings.append(
                Posting(
                    id=slug,
                    title=title,
                    company=str(job.get("company_name") or "").strip(),
                    location=str(job.get("location") or "").strip(),
                    url=str(job.get("url") or "").strip(),
                    posted_at=_posted_date(job.get("created_at")),
                    remote=bool(job.get("remote")),
                    tags=tuple(
                        str(tag).strip() for tag in job.get("tags", []) if str(tag).strip()
                    ),
                    description=str(job.get("description") or "").strip(),
                )
            )
    return postings


def _cache_root(cache_dir: Path | str | None) -> Path:
    return Path(cache_dir) if cache_dir else Path(os.getenv("PIVOTT_CACHE_DIR") or ".cache")


def _cached_pages(folder: Path, day: str, pages: int) -> list[dict] | None:
    payloads: list[dict] = []
    for page in range(1, pages + 1):
        cache_file = folder / f"{day}-p{page}.json"
        if not cache_file.exists():
            return None
        payloads.append(json.loads(cache_file.read_text(encoding="utf-8")))
    return payloads


def _cached_days(folder: Path) -> list[str]:
    days: set[str] = set()
    for path in folder.glob("*-p*.json"):
        match = re.match(r"(\d{4}-\d{2}-\d{2})-p\d+\.json$", path.name)
        if match:
            days.add(match.group(1))
    return sorted(days, reverse=True)


def fetch_arbeitnow(
    pages: int = 5,
    *,
    cache_dir: Path | str | None = None,
    offline: bool = False,
) -> list[Posting]:
    """Fetch and normalise Arbeitnow postings, caching each page per day."""
    pages = max(1, min(int(pages), 10))
    root = _cache_root(cache_dir)
    folder = root / "arbeitnow"
    folder.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()

    cached = _cached_pages(folder, today, pages)
    if cached is not None:
        return postings_from_arbeitnow(cached)

    if offline:
        for day in _cached_days(folder):
            cached = _cached_pages(folder, day, pages)
            if cached is not None:
                return postings_from_arbeitnow(cached)
        raise JobSourceError(
            f"offline mode and no cached Arbeitnow snapshot with {pages} page(s) "
            f"in {folder}; run once online"
        )

    import httpx

    payloads: list[dict] = []
    for page in range(1, pages + 1):
        cache_file = folder / f"{today}-p{page}.json"
        try:
            response = httpx.get(
                ARBEITNOW_URL, params={"page": page}, timeout=40, follow_redirects=True
            )
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:  # noqa: BLE001 - surfaced as a source error
            raise JobSourceError(f"Arbeitnow page {page} failed: {exc}") from exc
        cache_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        payloads.append(payload)

    return postings_from_arbeitnow(payloads)


def fetch_adzuna_counts(
    terms_by_role: dict[str, tuple[str, ...]],
    *,
    country: str = DEFAULT_COUNTRY,
    app_id: str | None = None,
    app_key: str | None = None,
    cache_dir: Path | str | None = None,
    offline: bool = False,
) -> dict[str, int]:
    """Return the number of live postings per role, using Adzuna's ``count``.

    Each role asks several search terms; the largest count wins so overlapping
    terms do not double-count the same posting.
    """
    app_id = app_id or os.getenv("ADZUNA_APP_ID", "").strip()
    app_key = app_key or os.getenv("ADZUNA_APP_KEY", "").strip()
    if not app_id or not app_key:
        raise JobSourceError(
            "Adzuna needs ADZUNA_APP_ID and ADZUNA_APP_KEY; "
            "unset them to use the keyless Arbeitnow source"
        )

    root = _cache_root(cache_dir)
    folder = root / "adzuna"
    folder.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    cache_file = folder / f"{today}-{country}.json"
    if cache_file.exists():
        return {role: int(value) for role, value in json.loads(cache_file.read_text()).items()}

    if offline:
        raise JobSourceError(f"offline mode but no cached Adzuna counts for {today}")

    import httpx

    counts: dict[str, int] = {}
    for role_id, terms in terms_by_role.items():
        best = 0
        for term in terms:
            try:
                response = httpx.get(
                    ADZUNA_URL.format(country=country, page=1),
                    params={
                        "app_id": app_id,
                        "app_key": app_key,
                        "results_per_page": 1,
                        "what": term,
                        "content-type": "application/json",
                    },
                    timeout=40,
                    follow_redirects=True,
                )
                response.raise_for_status()
                best = max(best, int(response.json().get("count") or 0))
            except Exception as exc:  # noqa: BLE001
                raise JobSourceError(f"Adzuna search for {term!r} failed: {exc}") from exc
        counts[role_id] = best

    cache_file.write_text(json.dumps(counts), encoding="utf-8")
    return counts


def build_title_index(
    job_titles_by_role: dict[str, tuple[str, ...]],
    aliases_by_role: dict[str, tuple[str, ...]] | None = None,
) -> list[tuple[str, str]]:
    """Return ``(normalised title, role_id)`` pairs, longest title first."""
    index: dict[str, str] = {}
    for role_id, titles in job_titles_by_role.items():
        for title in titles:
            key = _normalise(title)
            if len(key) >= 5:
                index.setdefault(key, role_id)
    for role_id, aliases in (aliases_by_role or {}).items():
        for alias in aliases:
            key = _normalise(alias)
            if len(key) >= 4:
                index[key] = role_id
    return sorted(index.items(), key=lambda item: (-len(item[0]), item[0]))


def match_postings(postings: list[Posting], index: list[tuple[str, str]]) -> MatchResult:
    """Assign each posting to at most one role by longest title match.

    Every contiguous word sequence in the posting title and tags is looked up in
    the O*NET/alias title index; the longest hit wins. This is O(words) per
    posting instead of scanning thousands of titles.
    """
    lookup = {title: role for title, role in index}
    max_words = max((len(title.split()) for title, _role in index), default=1)
    counts: dict[str, int] = {}
    matched_postings: dict[str, list[tuple[Posting, str]]] = {}
    matched = 0

    for posting in postings:
        words = _normalise(f"{posting.title} {' '.join(posting.tags)}").split()
        best_role: str | None = None
        best_title = ""
        for size in range(1, min(max_words, len(words)) + 1):
            for start in range(0, len(words) - size + 1):
                candidate = " ".join(words[start : start + size])
                role_id = lookup.get(candidate)
                if role_id and len(candidate) > len(best_title):
                    best_role = role_id
                    best_title = candidate
        if best_role is None:
            continue
        counts[best_role] = counts.get(best_role, 0) + 1
        matched_postings.setdefault(best_role, []).append((posting, best_title))
        matched += 1

    return MatchResult(
        counts=counts,
        postings_by_role=matched_postings,
        matched=matched,
        unmatched=len(postings) - matched,
        method="longest reported O*NET job title or alias in the posting title/tags",
    )


def demand_from_counts(counts: dict[str, int], role_ids: list[str]) -> dict[str, int]:
    """Scale raw posting counts to the 0-100 demand field, relative to the top role."""
    if not counts:
        return {role_id: 50 for role_id in role_ids}
    top = max(counts.values())
    if top <= 0:
        return {role_id: 1 for role_id in role_ids}
    return {
        role_id: max(1, round(100 * counts.get(role_id, 0) / top))
        for role_id in role_ids
    }
